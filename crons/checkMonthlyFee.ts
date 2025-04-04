import moment from "moment";
import "humanizer/toQuantity.ts";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../env.ts";
import checkAccounts from "./checkAccounts.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import Node from "../types/collections/node.type.ts";
import getMonthlyFee from "../utils/getMonthlyFee.ts";
import hasClientPayed from "../utils/hasClientPayed.ts";
import { ShowQuantityAs } from "humanizer/toQuantity.ts";
import Account from "../types/collections/account.type.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { InlineKeyboard } from "grammy/convenience/keyboard.ts";
import objectToTableText from "../telegram/objectToTableText.ts";
import submitTransaction from "../incognito/submitTransaction.ts";
import { moveDecimalDot, toFixedS } from "../utils/numbersString.ts";
import { getAccountById } from "../controllers/account.controller.ts";
import { MonthlyPayments, monthlyPayments } from "../utils/variables.ts";
import deleteDockerAndConfigs from "../incognito/deleteDockerAndConfigs.ts";
import { changeClient, getClients } from "../controllers/client.controller.ts";
import { AccountTransactionType } from "../types/collections/accountTransaction.type.ts";
import { adminAccount, incognitoFee, adminTelegram, incognitoFeeInt, maxNotPayedDays } from "../constants.ts";

const { None } = ShowQuantityAs;
const contactKeyboard = new InlineKeyboard().url("Contact", `tg://user?id=${adminTelegram}`);

export default async function checkMonthlyFee(removeNotPayedNodes: boolean) {
  const thisMonth = moment().utc().month();

  const clients = await getClients({}, { projection: { account: 1, lastPayment: 1, telegram: 1 } });

  // reload all the accounts' balance
  if (clients.length > 0) await checkAccounts();

  for (const client of clients) {
    const { lastPayment, telegram } = client;

    // if the client has already paid this month, skip it
    if (hasClientPayed(lastPayment)) continue;
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
        await sendAcknowledgment(true, account, feeWithIncognitoFee, paymentData, telegram);
        await markAsCompleted(paymentData, client._id);
      } catch (e) {
        // say that an error occured
        handleError(e);
        paymentData.errorInTransaction = true;
        await sendAcknowledgment(false, account, feeWithIncognitoFee, paymentData, telegram);
      }
    }
    //
    // don't continue if there was an error in the transaction
    else if (paymentData.errorInTransaction) continue;
    //
    // if it's the day to remove the nodes
    else if (removeNotPayedNodes) {
      const nodes = await getNodes(
        { client: client._id, inactive: false },
        { projection: { _id: 0, dockerIndex: 1, number: 1 } }
      );
      for (const node of nodes)
        await deleteDockerAndConfigs({
          dockerIndex: node.dockerIndex,
          clientId: client._id,
          number: node.number,
        });
      await sendThatNodesHaveBeenRemoved(telegram, nodes);
    }
    //
    // if it does't have enough balance, send a warning if it hasn't been sent today.
    // don't send a warning if there was an error in the transaction
    else if (paymentData.lastWarningDay !== moment().utc().date() && !paymentData.errorInTransaction)
      await sendWarning(account, feeWithIncognitoFee, paymentData, telegram);
  }
}

async function sendAcknowledgment(
  successfull: boolean,
  account: Pick<Account, "_id" | "privateKey" | "paymentAddress" | "balance">,
  feeWithIncognitoFee: number,
  paymentData: MonthlyPayments,
  telegramID?: number | string
) {
  const numbers = {
    ["Monthly fee - 10%"]: paymentData.fee === null ? "Error gathering data" : moveDecimalDot(paymentData.fee, -9),
    ["Incognito fee"]: incognitoFee,
    ["Previous balance"]: moveDecimalDot(account.balance, -9),
    ["Current balance"]: moveDecimalDot(account.balance - feeWithIncognitoFee, -9),
  };
  const totalEarnings =
    paymentData.fee === null ? "Error gathering data" : toFixedS((paymentData.fee * 10) / 1e9, 9);

  const details =
    `${objectToTableText(numbers, "<code>", "</code>")}\n\n` +
    `You can manage your balance <a href='${WEBSITE_URL}/account'>here</a>.`;

  const type: "automatic" | "deposit" = paymentData.lastWarningDay === null ? "automatic" : "deposit";
  const error = paymentData.errorInTransaction;

  let message = "";

  if (!error)
    message =
      (type === "automatic"
        ? `Hello 👋.\nThis month your nodes have earned <code>${totalEarnings}</code> PRV.\n\n` +
          `Your monthly fee has been automatically charged from your balance.`
        : `Your deposit has been received and the monthly fee paid.`) +
      `\n\n${details}\n\n` +
      `Have a nice month!`;
  // error in transaction
  else if (!successfull)
    message =
      "Unfortunately, an error occurred while processing the " +
      (type === "automatic" ? `automatic payment.` : "payment, although your deposit has been received.") +
      "\n\nPlease don't worry, we'll handle the payment manually. Your nodes won't be suspended, " +
      "unless you withdraw your balance.";
  // past error in transaction, but it was solved
  else
    message =
      "The error that occurred while processing the payment has been solved and the payment has been made.\n\n" +
      `${details}\n\n` +
      `Have a nice month!`;

  for (const to of [telegramID, adminTelegram])
    await sendHTMLMessage(
      message,
      to,
      { link_preview_options: { is_disabled: true }, reply_markup: contactKeyboard },
      "notificationsBot"
    );
}

async function sendWarning(
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

  const message =
    paymentData.lastWarningDay === null
      ? // a different message for the first warning
        `Hello 👋.\nThis month your nodes have earned <code>${totalEarnings}</code> PRV.\n\n` +
        `To continue hosting your nodes, deposit at least <code>${numbers["Total"]}</code> PRV.` +
        `\n\n${details}`
      : "Hello 👋.\n" +
        `Just to remind you you have until the end of this month's <b>${maxNotPayedDays.ordinalize()} day</b> ` +
        `to pay the fee of the last month, or else your nodes will be suspended, ` +
        `in which case you'll need to pay the initial setup again for each one if you wish to continue using our services.` +
        `\n\n${details}`;

  // send to admin too
  await sendHTMLMessage(
    message,
    adminTelegram,
    { link_preview_options: { is_disabled: true }, reply_markup: contactKeyboard },
    "notificationsBot"
  );
  const response = await sendHTMLMessage(
    message,
    telegramID,
    { link_preview_options: { is_disabled: true }, reply_markup: contactKeyboard },
    "notificationsBot"
  );

  // only if the user didn't blocked the bot and there's more than an hour left to the end of the day
  // count the message as sent
  if (typeof response === "object" && moment().utc().hour() < 23)
    paymentData.lastWarningDay = moment().utc().date();
}

async function sendThatNodesHaveBeenRemoved(
  telegramID: string | number,
  nodes: Pick<Node, "number" | "dockerIndex">[]
) {
  const many = nodes.length !== 1;
  const keyboard = contactKeyboard.clone().url("Reactivate nodes", `${WEBSITE_URL}/nodes/new`);
  await sendHTMLMessage(
    `Hello. Your ${"node".toQuantity(nodes.length, None)} ` +
      `<code>${nodes.map((n) => n.number).join("</code>, <code>")}</code>` +
      ` ${many ? "have" : "has"} been removed because you didn't pay the monthly fee.\n\n` +
      `If you wish to continue using our services, you can pay the initial ` +
      `setup again for ${many ? "each one" : "it"}.`,
    telegramID,
    { link_preview_options: { is_disabled: true }, reply_markup: keyboard },
    "notificationsBot"
  );
  // send to admin too
  await sendHTMLMessage(
    `Nodes <code>${nodes.map((n) => n.dockerIndex).join("</code>, <code>")}</code>` +
      ` have been deleted because they weren't paid for the last month.`,
    adminTelegram,
    { reply_markup: new InlineKeyboard().url("View nodes", `${WEBSITE_URL}/admin/nodes`) }
  );
}

async function markAsCompleted(paymentData: MonthlyPayments, clientId: ObjectId) {
  // reset the data
  paymentData.fee = null;
  paymentData.lastWarningDay = null;
  paymentData.errorInTransaction = false;
  paymentData.forMonth = moment().utc().month();
  await changeClient({ _id: clientId }, { $set: { lastPayment: new Date() } });
}
