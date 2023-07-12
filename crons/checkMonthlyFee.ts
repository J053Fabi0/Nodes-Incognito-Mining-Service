import { Big } from "math";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../env.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import Account from "../types/collections/account.type.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import objectToTableText from "../telegram/objectToTableText.ts";
import submitTransaction from "../incognito/submitTransaction.ts";
import { moveDecimalDot, toFixedS } from "../utils/numbersString.ts";
import { getAccountById } from "../controllers/account.controller.ts";
import { MonthlyPayments, monthlyPayments } from "../utils/variables.ts";
import { getTotalEarnings } from "../controllers/nodeEarning.controller.ts";
import { changeClient, getClients } from "../controllers/client.controller.ts";
import { AccountTransactionType } from "../types/collections/accountTransaction.type.ts";
import { adminAccount, incognitoFee, incognitoFeeInt, maxNotPayedDays } from "../constants.ts";

dayjs.extend(utc);

export default async function checkMonthlyFee() {
  const thisMonth = dayjs().utc().month();

  const clients = await getClients({}, { projection: { account: 1, lastPayment: 1, telegram: 1 } });

  for (const client of clients) {
    const { lastPayment, telegram } = client;
    // skip people who don't have a telegram account
    if (telegram === null) continue;

    // if the client has already paid this month, skip it
    if (dayjs(lastPayment).utc().month() === thisMonth) continue;
    // if the forMonth is not this one,
    // delete the last record to create a new one the next time it's accessed
    else if (monthlyPayments[`${client._id}`].forMonth !== thisMonth) delete monthlyPayments[`${client._id}`];

    const paymentData = monthlyPayments[`${client._id}`];
    if (paymentData.fee === null) paymentData.fee = await getMonthlyFee(client._id);

    // if there's no fee to pay, mark it as completed and continue
    if (paymentData.fee === 0) {
      await markAsCompleted(paymentData, client._id);
      continue;
    }

    // get the balance of the client
    const account = await getAccountById(client.account, {
      projection: { balance: 1, privateKey: 1, paymentAddress: 1 },
    });
    if (!account) {
      handleError(new Error(`No account for user ${client._id}`));
      continue;
    }

    const feeWithIncognitoFee = paymentData.fee + incognitoFeeInt;

    // if the client has enough balance, do the payment
    if (account.balance >= feeWithIncognitoFee) {
      try {
        await submitTransaction(
          {
            maxRetries: 20,
            userId: client._id,
            retryDelay: 10 * 60,
            account: account._id,
            amount: paymentData.fee,
            sendTo: adminAccount.paymentAddress,
            type: AccountTransactionType.EXPENSE,
            privateKey: await cryptr.decrypt(account.privateKey),
            details: `Monthly fee. 10% of all earnings + ${incognitoFee} to cover the blockchain fee.`,
          },
          true
        );
        await sendAkcnowledgment(true, account, feeWithIncognitoFee, paymentData, telegram);
        await markAsCompleted(paymentData, client._id);
      } catch (e) {
        // say that an error occured
        handleError(e);
        paymentData.errorInTransaction = true;
        await sendAkcnowledgment(false, account, feeWithIncognitoFee, paymentData, telegram);
      }
    }
    // if it does't have enough balance, send a warning if it hasn't been sent today.
    // don't send a warning if there was an error in the transaction
    else if (paymentData.lastWarningDay !== dayjs().utc().date() && !paymentData.errorInTransaction)
      await sendWarning(account, feeWithIncognitoFee, paymentData, telegram);
  }
}

/** Int format, without incognito fee */
async function getMonthlyFee(client: ObjectId): Promise<number> {
  const nodes = await getNodes({ client }, { projection: { _id: 1 } }).then((ns) => ns.map((n) => n._id));
  if (!nodes.length) return 0;

  const earningsLastMonth = await getTotalEarnings(nodes, 1);
  return +toFixedS(Big(earningsLastMonth).div(10).mul(1e9).valueOf(), 0);
}

export async function sendAkcnowledgment(
  successfull: boolean,
  account: Pick<Account, "_id" | "privateKey" | "paymentAddress" | "balance">,
  feeWithIncognitoFee: number,
  paymentData: MonthlyPayments,
  telegramID: number | string
) {
  const numbers = {
    ["Monthly fee - 10%"]: moveDecimalDot(paymentData.fee!, -9),
    ["Incognito fee"]: incognitoFee,
    ["Previous balance"]: moveDecimalDot(account.balance, -9),
    ["Current balance"]: moveDecimalDot(account.balance - feeWithIncognitoFee, -9),
  };
  const totalEarnings = toFixedS((paymentData.fee! * 10) / 1e9, 9);

  const details =
    `${objectToTableText(numbers, "<code>", "</code>")}\n\n` +
    `You can manage your balance <a href='${WEBSITE_URL}/account'>here</a>.`;

  const type: "automatic" | "deposit" = paymentData.lastWarningDay === null ? "automatic" : "deposit";
  const error = paymentData.errorInTransaction;

  if (!error)
    await sendHTMLMessage(
      (type === "automatic"
        ? `Hello 👋.\nThis month your nodes have earned <code>${totalEarnings}</code> PRV.\n\n` +
          `Your monthly fee has been automatically charged from your balance.`
        : `Your deposit has been received and the monthly fee paid.`) +
        `\n\n${details}\n\n` +
        `Have a nice month!`,
      telegramID,
      { disable_web_page_preview: true }
    );
  // error in transaction
  else if (!successfull)
    await sendHTMLMessage(
      "Unfortunately, an error occurred while processing the " +
        (type === "automatic" ? `automatic payment.` : "payment, although your deposit has been received.") +
        "\n\nPlease don't worry, we'll handle the payment manually. Your nodes won't be suspended, " +
        "unless you withdraw your balance.",
      telegramID,
      { disable_web_page_preview: true }
    );
  // past error in transaction, but it was solved
  else
    await sendHTMLMessage(
      "The error that occurred while processing the payment has been solved and the payment has been made.\n\n" +
        `${details}\n\n` +
        `Have a nice month!`,
      telegramID,
      { disable_web_page_preview: true }
    );
}

export async function sendWarning(
  account: Pick<Account, "_id" | "privateKey" | "paymentAddress" | "balance">,
  feeWithIncognitoFee: number,
  paymentData: MonthlyPayments,
  telegramID: number | string
) {
  const numbers = {
    ["Monthly fee - 10%"]: moveDecimalDot(paymentData.fee!, -9),
    ["Incognito fee"]: incognitoFee,
    ["Balance"]: moveDecimalDot(account.balance, -9),
    ["Total"]: moveDecimalDot(feeWithIncognitoFee - account.balance, -9),
  };
  const totalEarnings = toFixedS((paymentData.fee! * 10) / 1e9, 9);

  const details =
    `${objectToTableText(numbers, "<code>", "</code>")}\n\n` +
    `Deposit to:\n<code>${account.paymentAddress}</code>.\n\n` +
    `You can manage your balance <a href='${WEBSITE_URL}/me'>here</a>.`;

  const response = await sendHTMLMessage(
    paymentData.lastWarningDay === null
      ? // a different message for the first warning
        `Hello 👋.\nThis month your nodes have earned <code>${totalEarnings}</code> PRV.\n\n` +
          `To continue hosting your nodes, deposit at least <code>${numbers["Total"]}</code> PRV.` +
          `\n\n${details}`
      : "Hello 👋.\n" +
          `Just to remind you you have until the end of this month's <b>${maxNotPayedDays.ordinalize()} day</b> ` +
          `to pay the fee of the last month, or else your nodes will be suspended, ` +
          `in which case you'll need to pay the initial setup again for each one if you wish to continue using our services.` +
          `\n\n${details}`,
    telegramID,
    { disable_web_page_preview: true }
  );

  // only if the user didn't blocked the bot and there's more than an hour left to the end of the day
  // count the message as sent
  if (typeof response === "object" && dayjs().utc().hour() < 23) paymentData.lastWarningDay = dayjs().utc().date();
}

async function markAsCompleted(paymentData: MonthlyPayments, clientId: ObjectId) {
  await changeClient({ _id: clientId }, { $set: { lastPayment: new Date() } });

  // reset the data
  paymentData.fee = null;
  paymentData.lastWarningDay = null;
  paymentData.errorInTransaction = false;
  paymentData.forMonth = dayjs().utc().month();
}
