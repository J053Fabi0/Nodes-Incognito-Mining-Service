import { Handlers } from "$fresh/server.ts";
import State from "../../types/state.type.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface NodesProps {
  isAdmin: boolean;
}

export const handler: Handlers<NodesProps, State> = {
  GET(_, ctx) {
    return ctx.render({ isAdmin: ctx.state.isAdmin });
  },
};

export default function Nodes() {
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your nodes
      </Typography>

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
