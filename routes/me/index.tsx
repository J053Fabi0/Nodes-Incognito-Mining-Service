import { Handlers } from "$fresh/server.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import State from "../../types/state.type.ts";

const styles = {
  li: `${getTypographyClass("lead")}`,
};

interface AccountProps {
  isAdmin: boolean;
}

export const handler: Handlers<AccountProps, State> = {
  GET(_, ctx) {
    return ctx.render({ isAdmin: ctx.state.isAdmin });
  },
};

export default function Account() {
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Your account
      </Typography>

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="me/balance" class="underline">
            My balance
          </a>
        </li>

        <li class={styles.li}>
          <a href="me/transactions?relative" class="underline">
            Deposits, withdrawals, and payments
          </a>
        </li>
      </ul>
    </>
  );
}
