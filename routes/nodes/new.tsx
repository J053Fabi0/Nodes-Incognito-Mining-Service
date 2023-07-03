import { qrcode } from "qrcode";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import getPRVPrice from "../../utils/getPRVPrice.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Typography from "../../components/Typography.tsx";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import { minutesOfPriceStability, setupFeeUSD } from "../../constants.ts";

dayjs.extend(utc);

interface NewNodeProps {
  expires: number;
  /** Int format */
  balance: number;
  prvPrice: number;
  prvToPay: number;
  isAdmin: boolean;
  paymentAddress: string;
  paymentAddressImage: string;
}

export const handler: Handlers<NewNodeProps, State> = {
  async GET(_, ctx) {
    const savedPrvPrice = ctx.state.prvPrice;

    const account = (await getAccount(
      { _id: ctx.state.user!.account },
      { projection: { balance: 1, paymentAddress: 1, _id: 0 } }
    ))!;

    // the confirmation expires in the previous time plus an exatra minutesOfPriceStability
    const confirmationExpires = dayjs(savedPrvPrice.expires)
      .utc()
      .add(minutesOfPriceStability, "minute")
      .valueOf();

    // if it is enough balance to pay for the node and the confirmation hasn't expired,
    // redirect to the confirmation page
    if (account.balance >= savedPrvPrice.prvToPay * 1e9 && confirmationExpires > Date.now())
      return redirect("/nodes/new-confirm");

    if (savedPrvPrice.expires <= Date.now()) {
      savedPrvPrice.usd = await getPRVPrice();
      savedPrvPrice.prvToPay = +toFixedS(setupFeeUSD / savedPrvPrice.usd, 2);
      savedPrvPrice.expires = dayjs().utc().add(minutesOfPriceStability, "minute").valueOf();

      ctx.state.session.set("prvPrice", savedPrvPrice);
    }

    const base64Image = await qrcode(account.paymentAddress, { size: 300, errorCorrectLevel: "L" });

    return ctx.render({
      balance: account.balance,
      isAdmin: ctx.state.isAdmin,
      prvPrice: savedPrvPrice.usd,
      expires: savedPrvPrice.expires,
      paymentAddressImage: base64Image,
      prvToPay: savedPrvPrice.prvToPay,
      paymentAddress: account.paymentAddress,
    });
  },
};

export default function NewNode({ data }: PageProps<NewNodeProps>) {
  const { prvPrice, paymentAddressImage, expires, prvToPay, paymentAddress } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Host a new node
      </Typography>

      <Typography variant="lead" class="mb-3">
        Deposit{" "}
        <b>
          <code>{prvToPay}</code>
        </b>{" "}
        PRV to the following address.
      </Typography>

      <div class="overflow-x-auto">
        <Typography variant="lead" class="mb-3">
          <code>{paymentAddress}</code>
        </Typography>
      </div>

      <div class="w-100 flex justify-center">
        <img src={paymentAddressImage} alt="Payment address" class="mb-3" />
      </div>

      <Typography variant="lead" class="mb-3">
        Balance:{" "}
        <b>
          <code>
            <Balance
              goal={prvToPay}
              websiteUrl={WEBSITE_URL}
              initialBalance={data.balance}
              redirectsTo="/nodes/new-confirm"
            />
          </code>
        </b>{" "}
        PRV.
      </Typography>

      <Typography variant="lead" class="mb-3">
        Time remaining:{" "}
        <b>
          <TimeLeft date={expires} />
        </b>
        . You'll be automatically redirected to the confirmation page when the balance is enough.
      </Typography>

      <Typography variant="lead" class="mb-3 before:content-['👉&nbsp;']">
        This address is unique to your account and will never change. You can save it for future use.
      </Typography>

      {/* Why XX PRV? */}
      <Typography variant="h3" class="mt-7 mb-2">
        Why <code>{prvToPay}</code> PRV?
      </Typography>
      <Typography variant="lead">
        It's a one-time fee to cover the cost of setting up a new node. It's equivalent to {setupFeeUSD} USD at the
        current PRV price of <code>{prvPrice}</code> USD, fetched from{" "}
        <a class="underline" href="https://www.coingecko.com/en/coins/incognito">
          CoinGeko
        </a>
        .
      </Typography>

      {/* After you pay */}
      <AfterYouPay class="mt-5" />
    </>
  );
}
