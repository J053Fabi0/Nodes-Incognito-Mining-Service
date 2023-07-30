import { ObjectId } from "mongo/mod.ts";
import State from "../../types/state.type.ts";
import { maxNotPayedDays } from "../../constants.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import getTimeToPayData from "../../utils/getTimeToPayData.ts";
import { countNodes } from "../../controllers/node.controller.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import TimeToPay, { PaymentStatus, TimeToPayProps } from "../../islands/Nodes/TimeToPay.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface NodesProps extends Pick<TimeToPayProps, "monthlyFee" | "paymentStatus" | "balance"> {
  isAdmin: boolean;
  isNewClient: boolean;
}

export const handler: Handlers<NodesProps, State> = {
  async GET(_, ctx) {
    const clientId = ctx.state.userId!;
    const isNewClient = (await countNodes({ client: new ObjectId(clientId) })) === 0;

    const { balance, monthlyFee, paymentStatus } = isNewClient
      ? { balance: 0, monthlyFee: 0, paymentStatus: PaymentStatus.PAYED }
      : await getTimeToPayData(clientId, ctx.state.user!.lastPayment, ctx.state.user!.account);

    return ctx.render({
      balance,
      monthlyFee,
      isNewClient,
      paymentStatus,
      isAdmin: ctx.state.isAdmin,
    });
  },
};

export default function Nodes({ data, url }: PageProps<NodesProps>) {
  const { monthlyFee, balance, paymentStatus, isNewClient } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

      {isNewClient ? null : (
        <TimeToPay
          balance={balance}
          path={url.pathname}
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

        {isNewClient ? null : (
          <li class={styles.li}>
            <a href="nodes/delete" class="underline">
              Delete nodes
            </a>
          </li>
        )}
      </ul>
    </>
  );
}
