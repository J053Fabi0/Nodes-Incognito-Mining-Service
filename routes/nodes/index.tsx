import { ObjectId } from "mongo/mod.ts";
import State from "../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import getMonthlyFee from "../../utils/getMonthlyFee.ts";
import getIsTimeToPay from "../../utils/getIsTimeToPay.ts";
import getPaymentStatus from "../../utils/getPaymentStatus.ts";
import { incognitoFeeInt, maxNotPayedDays } from "../../constants.ts";
import { getAccountById } from "../../controllers/account.controller.ts";
import TimeToPay, { PaymentStatus } from "../../islands/Nodes/TimeToPay.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface NodesProps {
  isAdmin: boolean;
  balance: number;
  /** Plus the incognito fee */
  monthlyFee: number;
  paymentStatus: PaymentStatus;
}

export const handler: Handlers<NodesProps, State> = {
  async GET(_, ctx) {
    const isTimeToPay = getIsTimeToPay();

    const monthlyFee = (await getMonthlyFee(new ObjectId(ctx.state.userId!))) + incognitoFeeInt;
    const balance = (await getAccountById(ctx.state.user!.account, { projection: { balance: 1, _id: 0 } }))!
      .balance;

    const paymentStatus = getPaymentStatus(ctx.state.userId!, ctx.state.user!.lastPayment, isTimeToPay);

    return ctx.render({
      balance,
      monthlyFee,
      paymentStatus,
      isAdmin: ctx.state.isAdmin,
    });
  },
};

export default function Nodes({ data }: PageProps<NodesProps>) {
  const { monthlyFee, balance, paymentStatus } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

      <TimeToPay
        balance={balance}
        monthlyFee={monthlyFee}
        paymentStatus={paymentStatus}
        maxNotPayedDays={maxNotPayedDays}
      />

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="nodes/monitor" class="underline">
            Monitor
          </a>
        </li>

        <li class={styles.li}>
          <a href="nodes/earnings/monthly" class="underline">
            Monthly earnings statistics
          </a>
        </li>

        <li class={styles.li}>
          <a href="nodes/earnings?relative" class="underline">
            All earnings records
          </a>
        </li>

        <li class={styles.li}>
          <a href="nodes/notifications" class="underline">
            Notifications
          </a>
        </li>
      </ul>
    </>
  );
}
