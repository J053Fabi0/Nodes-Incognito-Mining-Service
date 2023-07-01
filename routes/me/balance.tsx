import { qrcode } from "qrcode";
import State from "../../types/state.type.ts";
import { incognitoFee } from "../../constants.ts";
import Withdraw from "../../islands/Withdraw.tsx";
import BalanceIsland from "../../islands/Balance.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { getAccount } from "../../controllers/account.controller.ts";

interface BalanceProps {
  balance: number;
  paymentAddress: string;
  paymentAddressImage: string;
}

export const handler: Handlers<BalanceProps, State> = {
  async GET(_, ctx) {
    const account = (await getAccount(
      { _id: ctx.state.user!.account },
      { projection: { balance: 1, paymentAddress: 1, _id: 0 } }
    ))!;

    const base64Image = await qrcode(account.paymentAddress, { size: 300, errorCorrectLevel: "L" });

    return ctx.render({
      ...account,
      paymentAddressImage: base64Image,
    });
  },
};

export default function Balance({ data }: PageProps<BalanceProps>) {
  const { paymentAddressImage, paymentAddress, balance } = data;

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

      <Withdraw
        balance={balance}
        incognitoFee={incognitoFee}
        paymentAddressPattern={IncognitoCli.paymentAddressRegex.source}
      />
    </>
  );
}
