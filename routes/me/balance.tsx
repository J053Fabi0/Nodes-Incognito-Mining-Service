import { qrcode } from "qrcode";
import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import { incognitoFee } from "../../constants.ts";
import Withdraw from "../../islands/Withdraw.tsx";
import BalanceIsland from "../../islands/Balance.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Typography from "../../components/Typography.tsx";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { getAccount } from "../../controllers/account.controller.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";

interface BalanceProps {
  balance: number;
  errors: ZodIssue[] | undefined;
  paymentAddress: string;
  paymentAddressImage: string;
  withdrawAmount?: string;
  withdrawPaymentAddress?: string;
}

const URL = `${WEBSITE_URL}/me/balance`;

async function getProjectedAccount(id: ObjectId) {
  const account = (await getAccount({ _id: id }, { projection: { balance: 1, paymentAddress: 1, _id: 0 } }))!;
  return account;
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
      withdrawAmount: ctx.state.session.flash("withdrawAmount"),
      withdrawPaymentAddress: ctx.state.session.flash("withdrawPaymentAddress"),
    });
  },

  async POST(req, ctx) {
    const balance = (await getProjectedAccount(ctx.state.user!.account)).balance;
    if (balance === 0) return redirect(URL);

    const form = await req.formData();

    ctx.state.session.flash("withdrawAmount", form.get("amount")?.toString());
    ctx.state.session.flash("withdrawPaymentAddress", form.get("paymentAddress")?.toString());

    const max = (balance - incognitoFee * 1e9) / 1e9;

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

    return redirect(URL);
  },
};

export default function Balance({ data }: PageProps<BalanceProps>) {
  const { paymentAddressImage, paymentAddress, balance, errors, withdrawAmount, withdrawPaymentAddress } = data;

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

      <hr class="my-5" />

      <Typography variant="h4" class="mb-1">
        Withdraw
      </Typography>
      <Typography variant="p">
        You can withdraw your balance to any Incognito wallet. The transaction fee is <code>{incognitoFee}</code>{" "}
        PRV.
      </Typography>

      {balance <= incognitoFee * 1e9 ? null : (
        <Withdraw
          balance={balance}
          defaultAmount={withdrawAmount}
          defautlPaymentAddress={withdrawPaymentAddress}
          incognitoFee={incognitoFee}
          amountError={error(errors, "amount")?.message}
          paymentAddressPattern={IncognitoCli.paymentAddressRegex.source}
        />
      )}
    </>
  );
}
