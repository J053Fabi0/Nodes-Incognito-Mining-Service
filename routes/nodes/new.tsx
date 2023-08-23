import { Big } from "math";
import { qrcode } from "qrcode";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import { prvToPay } from "../../utils/variables.ts";
import getPRVPrice from "../../utils/getPRVPrice.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Typography from "../../components/Typography.tsx";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import { incognitoFee, minutesOfPriceStability, setupFeeUSD } from "../../constants.ts";

dayjs.extend(utc);

const CONFIRM_URL = `${WEBSITE_URL}/nodes/new-confirm`;

interface NewNodeProps {
  expires: number;
  /** Int format */
  balance: number;
  prvPrice: number;
  prvToPay: number;
  isAdmin: boolean;
  paymentAddress: string;
  usedSetupFeeUSD: number;
  paymentAddressImage: string;
}

export const handler: Handlers<NewNodeProps, State> = {
  async GET(_, ctx) {
    const savedPrvPrice = prvToPay[ctx.state.userId!];
    const isAdmin = ctx.state.isAdmin;

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
    // if (account.balance >= savedPrvPrice.prvToPay * 1e9 && confirmationExpires > Date.now())
    //   return redirect("/nodes/new-confirm");

    const { customSetupFeeUSD } = ctx.state.user!;
    const usedSetupFeeUSD = customSetupFeeUSD ?? setupFeeUSD;

    // Set the new price if the previous one has expired
    if (savedPrvPrice.expires <= Date.now()) {
      savedPrvPrice.usd = await getPRVPrice();
      // add the fee to transfer the PRV to the admin account later
      savedPrvPrice.prvToPay = isAdmin
        ? 0
        : +toFixedS(new Big(usedSetupFeeUSD).div(savedPrvPrice.usd).add(incognitoFee).valueOf(), 2);
      savedPrvPrice.expires = dayjs().utc().add(minutesOfPriceStability, "minute").valueOf();
    }

    const base64Image = await qrcode(account.paymentAddress, { size: 300, errorCorrectLevel: "L" });

    // if (account.balance >= savedPrvPrice.prvToPay * 1e9) return redirect(CONFIRM_URL);

    return ctx.render({
      isAdmin,
      usedSetupFeeUSD,
      balance: account.balance,
      prvPrice: savedPrvPrice.usd,
      expires: savedPrvPrice.expires,
      paymentAddressImage: base64Image,
      prvToPay: savedPrvPrice.prvToPay,
      paymentAddress: account.paymentAddress,
    });
  },
};

export default function NewNode({ data }: PageProps<NewNodeProps>) {
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Host a new node
      </Typography>

      <Typography variant="lead" class="mb-3">
        Unfortunately, we're not accepting new nodes at the moment. We're working on expanding our infrastructure
        to support more nodes. Please check back later.
      </Typography>
    </>
  );

  const { prvPrice, paymentAddressImage, expires, prvToPay, paymentAddress, usedSetupFeeUSD } = data;

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

      <Typography variant="lead" class="mb-3 flex gap-2 items-center">
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
        <AiOutlineLoading3Quarters size={16} class="animate-spin duration-75" title="Updated every 6 seconds" />
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

      <Typography variant="lead" class="mb-3">
        You'll be able to withdraw any deposited PRV form{" "}
        <a class="underline" href="/me">
          the balance page
        </a>{" "}
        if you change your mind before confirming.
      </Typography>

      {/* Why XX PRV? */}
      <Typography variant="h3" class="mt-7 mb-2">
        Why <code>{prvToPay}</code> PRV?
      </Typography>
      <Typography variant="lead">
        It's a one-time fee to cover the cost of setting up a new node. It's equivalent to {usedSetupFeeUSD} USD at
        the current PRV price of <code>{prvPrice}</code> USD, fetched directly from the USDT-PRV pair on the
        Incognito pDEX.
      </Typography>

      {/* After you pay */}
      <AfterYouPay class="mt-5" />
    </>
  );
}
