import { qrcode } from "qrcode";
import dayjs from "dayjs/mod.ts";
import "humanizer/toQuantity.ts";
import utc from "dayjs/plugin/utc.ts";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import Withdraw from "../../islands/Withdraw.tsx";
import cryptr from "../../utils/cryptrInstance.ts";
import LocaleDate from "../../islands/LocaleDate.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import RelativeDate from "../../islands/RelativeDate.tsx";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { getAccount } from "../../controllers/account.controller.ts";
import submitTransaction from "../../incognito/submitTransaction.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";
import PaymentAddress from "../../components/Account/PaymentAddress.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import { incognitoFee, incognitoFeeInt, maxNotPayedDays } from "../../constants.ts";
import { AccountTransactionType } from "../../types/collections/accountTransaction.type.ts";

dayjs.extend(utc);

const styles = { li: `${getTypographyClass("lead")}` };

const THIS_URL = `${WEBSITE_URL}/me`;
const TRANSACTIONS_URL = `${WEBSITE_URL}/me/transactions?relative`;

async function getProjectedAccount(id: ObjectId) {
  const account = (await getAccount(
    { _id: id },
    { projection: { balance: 1, paymentAddress: 1, privateKey: 1, _id: 0 } }
  ))!;
  return { ...account, privateKey: await cryptr.decrypt(account.privateKey) };
}

interface AccountProps {
  balance: number;
  isAdmin: boolean;
  paymentAddress: string;
  withdrawAmount?: string;
  paymentAddressImage: string;
  errors: ZodIssue[] | undefined;
  withdrawPaymentAddress?: string;
}

export const handler: Handlers<AccountProps, State> = {
  async GET(_, ctx) {
    const account = await getProjectedAccount(ctx.state.user!.account);
    return ctx.render({
      ...account,
      isAdmin: ctx.state.isAdmin,
      errors: ctx.state.session.flash("errors"),
      withdrawAmount: ctx.state.session.flash("withdrawAmount"),
      withdrawPaymentAddress: ctx.state.session.get("withdrawPaymentAddress"),
      paymentAddressImage: await qrcode(account.paymentAddress, { size: 200, errorCorrectLevel: "L" }),
    });
  },

  async POST(req, ctx) {
    const account = await getProjectedAccount(ctx.state.user!.account);
    if (account.balance === 0) return redirect(THIS_URL);

    const form = await req.formData();

    ctx.state.session.flash("withdrawAmount", form.get("amount")?.toString());
    ctx.state.session.set("withdrawPaymentAddress", form.get("paymentAddress")?.toString());

    /** Decimal format */
    const max = (account.balance - incognitoFeeInt) / 1e9;

    const { validatedData, errors } = await validateFormData(form, {
      paymentAddress: z.string().trim().regex(IncognitoCli.paymentAddressRegex, "Invalid payment address"),
      amount: z
        .number()
        .min(1e-9, "The minimum amount is 0.000000001 PRV")
        .max(max, `The maximum amount is ${toFixedS(max, 9)} PRV`),
    });

    if (errors) {
      ctx.state.session.flash("errors", errors);
      return redirect(THIS_URL);
    }

    // submit the transaction asynchronously
    submitTransaction({
      createdAt: Date.now(),
      userId: ctx.state.user!._id,
      privateKey: account.privateKey,
      account: ctx.state.user!.account,
      amount: validatedData.amount * 1e9,
      sendTo: validatedData.paymentAddress,
      type: AccountTransactionType.WITHDRAWAL,
    });

    return redirect(TRANSACTIONS_URL);
  },
};

export default function Account({ data }: PageProps<AccountProps>) {
  const { withdrawPaymentAddress, balance, errors } = data;
  const { paymentAddressImage, paymentAddress, withdrawAmount } = data;
  const nextPayment = dayjs().utc().add(1, "month").startOf("month").valueOf();

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your account
      </Typography>

      <Typography variant="h3" class="mt-5">
        Balance:{" "}
        <b>
          <code>
            <Balance initialBalance={balance} />
          </code>
        </b>{" "}
        PRV.
      </Typography>
      <Typography variant="p">
        The balance will be used to pay your monthly fee automatically if it is enough, else a message will be
        delivered via Telegram asking you to deposit more.
      </Typography>
      <Typography variant="p">
        The next payment will be on <LocaleDate date={nextPayment} />, <RelativeDate date={nextPayment} />
      </Typography>

      <hr class="my-5" />

      <PaymentAddress paymentAddress={paymentAddress} paymentAddressImage={paymentAddressImage} />

      <hr class="my-5" />

      <Typography variant="h4" class="mb-1">
        Withdraw
      </Typography>

      {balance <= incognitoFeeInt ? (
        <Typography variant="lead">
          {balance === 0 ? "You don't have any balance to withdraw." : "Your balance is too low to withdraw."}
        </Typography>
      ) : (
        <>
          <Typography variant="p">
            You can withdraw your balance to any Incognito wallet. The transaction fee is{" "}
            <code>{toFixedS(incognitoFee, 9)}</code> PRV.
          </Typography>

          <Withdraw
            balance={balance}
            defaultAmount={withdrawAmount}
            incognitoFeeInt={incognitoFeeInt}
            defautlPaymentAddress={withdrawPaymentAddress}
            amountError={error(errors, "amount")?.message}
            paymentAddressPattern={IncognitoCli.paymentAddressRegex.source}
          />
        </>
      )}

      <hr class="my-5" />

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="me/transactions?relative" class="underline">
            Transactions history
          </a>
        </li>
      </ul>
    </>
  );
}
