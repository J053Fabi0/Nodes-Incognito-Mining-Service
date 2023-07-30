import State from "../../types/state.type.ts";
import { maxNotPayedDays } from "../../constants.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import getTimeToPayData from "../../utils/getTimeToPayData.ts";
import TimeToPay, { TimeToPayProps } from "../../islands/Nodes/TimeToPay.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface NodesProps extends Pick<TimeToPayProps, "monthlyFee" | "paymentStatus" | "balance"> {
  isAdmin: boolean;
}

export const handler: Handlers<NodesProps, State> = {
  async GET(_, ctx) {
    const { balance, monthlyFee, paymentStatus } = await getTimeToPayData(
      ctx.state.userId!,
      ctx.state.user!.lastPayment,
      ctx.state.user!.account
    );

    return ctx.render({
      balance,
      monthlyFee,
      paymentStatus,
      isAdmin: ctx.state.isAdmin,
    });
  },
};

export default function Nodes({ data, url }: PageProps<NodesProps>) {
  const { monthlyFee, balance, paymentStatus } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

      <TimeToPay
        balance={balance}
        path={url.pathname}
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

        <li class={styles.li}>
          <a href="nodes/delete" class="underline">
            Delete nodes
          </a>
        </li>
      </ul>
    </>
  );
}
