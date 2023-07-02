import { qrcode } from "qrcode";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Withdraw from "../../islands/Withdraw.tsx";
import cryptr from "../../utils/cryptrInstance.ts";
import BalanceIsland from "../../islands/Balance.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Typography from "../../components/Typography.tsx";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { incognitoFee, incognitoFeeInt } from "../../constants.ts";
import { getAccount } from "../../controllers/account.controller.ts";
import submitTransaction from "../../incognito/submitTransaction.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";
import { AccountTransactionType } from "../../types/collections/accountTransaction.type.ts";

interface BalanceProps {
  balance: number;
  txHash?: string;
  sendingError?: boolean;
  paymentAddress: string;
  withdrawAmount?: string;
  paymentAddressImage: string;
  errors: ZodIssue[] | undefined;
  withdrawPaymentAddress?: string;
}

const THIS_URL = `${WEBSITE_URL}/me/balance`;
const TRANSACTIONS_URL = `${WEBSITE_URL}/me/transactions`;

async function getProjectedAccount(id: ObjectId) {
  const account = (await getAccount(
    { _id: id },
    { projection: { balance: 1, paymentAddress: 1, privateKey: 1, _id: 0 } }
  ))!;
  return { ...account, privateKey: await cryptr.decrypt(account.privateKey) };
}

export const handler: Handlers<BalanceProps, State> = {
  async GET(_, ctx) {
    const account = await getProjectedAccount(ctx.state.user!.account);
    return ctx.render({
      ...account,
      errors: ctx.state.session.flash("errors"),
      txHash: ctx.state.session.flash("txHash"),
      sendingError: ctx.state.session.flash("sendingError"),
      withdrawAmount: ctx.state.session.flash("withdrawAmount"),
      withdrawPaymentAddress: ctx.state.session.get("withdrawPaymentAddress"),
      paymentAddressImage: await qrcode(account.paymentAddress, { size: 300, errorCorrectLevel: "L" }),
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
      paymentAddress: z.string().regex(IncognitoCli.paymentAddressRegex, "Invalid payment address"),
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
      balance: account.balance,
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

export default function Balance({ data }: PageProps<BalanceProps>) {
  const { paymentAddressImage, paymentAddress, balance, errors, withdrawAmount } = data;
  const { withdrawPaymentAddress, txHash, sendingError } = data;

  return (
    <>
      <Typography variant="h3" class="mt-5">
        Balance:{" "}
        <b>
          <code>
            <BalanceIsland initialBalance={balance} />
          </code>
        </b>{" "}
        PRV.
      </Typography>

      <hr class="my-5" />

      <Typography variant="h4" class="mb-3">
        Payment address
      </Typography>
      <Typography variant="lead">The balance will be used to pay your monthly fee automatically.</Typography>

      <div class="overflow-x-auto mt-5">
        <Typography variant="lead" class="mb-3">
          <code>{paymentAddress}</code>
        </Typography>
      </div>

      <div class="w-100 flex justify-center">
        <img src={paymentAddressImage} alt="Payment address" class="mb-3" />
      </div>

      <Typography variant="lead" class="mb-3">
        This address is unique to your account and will never change. You can save it for future use.
      </Typography>

      {txHash && (
        <>
          <hr class="my-5" />

          <Typography variant="h4" class="mb-1 text-green-600">
            Withdraw successful
          </Typography>
          <Typography variant="p" class="break-words">
            Your withdrawal request has been sent. The transaction hash is <code>{txHash}</code>
          </Typography>
        </>
      )}

      {sendingError && (
        <>
          <hr class="my-5" />

          <Typography variant="h4" class="mb-1 text-red-700">
            Withdraw failed
          </Typography>
          <Typography variant="p">Your withdrawal request has failed. The problem has been notified.</Typography>
        </>
      )}

      {balance <= incognitoFeeInt ? null : (
        <>
          <hr class="my-5" />

          <Typography variant="h4" class="mb-1">
            Withdraw
          </Typography>
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
    </>
  );
}
