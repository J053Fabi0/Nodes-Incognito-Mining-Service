import { qrcode } from "qrcode";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import { incognitoFee } from "../../constants.ts";
import Withdraw from "../../islands/Withdraw.tsx";
import cryptr from "../../utils/cryptrInstance.ts";
import handleError from "../../utils/handleError.ts";
import BalanceIsland from "../../islands/Balance.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Typography from "../../components/Typography.tsx";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { updateAccount } from "../../utils/checkAccounts.ts";
import { changeAccount, getAccount } from "../../controllers/account.controller.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";

dayjs.extend(utc);

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

const URL = `${WEBSITE_URL}/me/balance`;

async function getProjectedAccount(id: ObjectId) {
  const account = (await getAccount(
    { _id: id },
    { projection: { balance: 1, paymentAddress: 1, privateKey: 1, _id: 0 } }
  ))!;

  return {
    ...account,
    privateKey: await cryptr.decrypt(account.privateKey),
  };
}

export const handler: Handlers<BalanceProps, State> = {
  async GET(_, ctx) {
    const account = await getProjectedAccount(ctx.state.user!.account);

    const base64Image = await qrcode(account.paymentAddress, { size: 300, errorCorrectLevel: "L" });

    const errors = ctx.state.session.flash("errors") as ZodIssue[] | undefined;

    return ctx.render({
      errors,
      ...account,
      paymentAddressImage: base64Image,
      txHash: ctx.state.session.flash("txHash"),
      sendingError: ctx.state.session.flash("sendingError"),
      withdrawAmount: ctx.state.session.flash("withdrawAmount"),
      withdrawPaymentAddress: ctx.state.session.flash("withdrawPaymentAddress"),
    });
  },

  async POST(req, ctx) {
    const account = await getProjectedAccount(ctx.state.user!.account);
    if (account.balance === 0) return redirect(URL);

    const working = ctx.state.session.get("working");
    if (working && dayjs().utc().diff(working, "minutes") <= 10) return redirect(URL);

    ctx.state.session.set("working", Date.now());

    const form = await req.formData();

    ctx.state.session.flash("withdrawAmount", form.get("amount")?.toString());
    ctx.state.session.flash("withdrawPaymentAddress", form.get("paymentAddress")?.toString());

    const max = (account.balance - incognitoFee * 1e9) / 1e9;

    const { validatedData, errors } = await validateFormData(form, {
      paymentAddress: z.string().regex(IncognitoCli.paymentAddressRegex, "Invalid payment address"),
      amount: z
        .number()
        .min(1e-9, "The minimum amount is 0.000000001 PRV")
        .max(max, `The maximum amount is ${toFixedS(max, 9)} PRV`),
    });

    if (errors) {
      ctx.state.session.flash("errors", errors);
      return redirect(URL);
    }

    const amountInt = validatedData.amount * 1e9;
    const incognitoCli = new IncognitoCli(account.privateKey);
    const txHash = await incognitoCli.send(validatedData.paymentAddress, amountInt).catch((e) => {
      handleError(e);
      ctx.state.session.flash("sendingError", true);
      return undefined;
    });

    if (txHash) {
      ctx.state.session.flash("txHash", txHash);

      updateAccount(account.privateKey, ctx.state.user!.account, account.balance)
        .catch(handleError)
        .finally(() => ctx.state.session.set("working", 0));

      await changeAccount(
        { _id: new ObjectId(ctx.state.user!.account) },
        { $set: { balance: account.balance - (amountInt + incognitoFee * 1e9) } }
      );
    }

    return redirect(URL);
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

      {balance <= incognitoFee * 1e9 ? null : (
        <>
          <hr class="my-5" />

          <Typography variant="h4" class="mb-1">
            Withdraw
          </Typography>
          <Typography variant="p">
            You can withdraw your balance to any Incognito wallet. The transaction fee is{" "}
            <code>{incognitoFee}</code> PRV.
          </Typography>

          <Withdraw
            balance={balance}
            incognitoFee={incognitoFee}
            defaultAmount={withdrawAmount}
            defautlPaymentAddress={withdrawPaymentAddress}
            amountError={error(errors, "amount")?.message}
            paymentAddressPattern={IncognitoCli.paymentAddressRegex.source}
          />
        </>
      )}
    </>
  );
}
