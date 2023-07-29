import moment from "moment";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../../env.ts";
import State from "../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import getMonthlyFee from "../../utils/getMonthlyFee.ts";
import hasClientPayed from "../../utils/hasClientPayed.ts";
import { monthlyPayments } from "../../utils/variables.ts";
import { incognitoFeeInt, maxNotPayedDays } from "../../constants.ts";
import { getAccountById } from "../../controllers/account.controller.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import TimeToPay, { PaymentStatus } from "../../islands/Nodes/TimeToPay.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface NodesProps {
  isAdmin: boolean;
  balance: number;
  /** Plus the incognito fee */
  monthlyFee: number;
  isTimeToPay: boolean;
  paymentStatus: PaymentStatus;
}

const testTimeToPay = true && !IS_PRODUCTION;
export const handler: Handlers<NodesProps, State> = {
  async GET(_, ctx) {
    const isTimeToPay = testTimeToPay || (moment().utc().date() >= 1 && moment().utc().date() <= maxNotPayedDays);
    const monthlyFee = isTimeToPay ? (await getMonthlyFee(new ObjectId(ctx.state.userId!))) + incognitoFeeInt : 0;
    const balance = isTimeToPay
      ? (await getAccountById(ctx.state.user!.account, { projection: { balance: 1, _id: 0 } }))!.balance
      : 0;

    const paymentStatus = isTimeToPay
      ? monthlyPayments[ctx.state.userId!].errorInTransaction
        ? PaymentStatus.ERROR
        : hasClientPayed(ctx.state.user!.lastPayment)
        ? PaymentStatus.DONE
        : PaymentStatus.PENDING
      : PaymentStatus.DONE;

    return ctx.render({
      balance,
      monthlyFee,
      isTimeToPay,
      paymentStatus,
      isAdmin: ctx.state.isAdmin,
    });
  },
};

export default function Nodes({ data }: PageProps<NodesProps>) {
  const { monthlyFee, isTimeToPay, balance, paymentStatus } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

      {isTimeToPay && (
        <TimeToPay
          balance={balance}
          monthlyFee={monthlyFee}
          paymentStatus={paymentStatus}
          maxNotPayedDays={maxNotPayedDays}
        />
      )}

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
