import State from "../../types/state.type.ts";
import { variablesToParse } from "../api/variables.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Client from "../../types/collections/client.type.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = { li: `${getTypographyClass("lead")}` };

interface AdminProps {
  user: Client;
}

export const handler: Handlers<AdminProps, State> = {
  GET(_, ctx) {
    return ctx.render({
      user: ctx.state.user!,
    });
  },
};

export default function Admin({ data }: PageProps<AdminProps>) {
  const { user } = data;
  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        {user.name}
      </Typography>
      <Typography variant="h4" class="mt-3 mb-5">
        {`${user._id}`}
        <br />
        {user.telegram}
      </Typography>

      <ul class="list-disc list-inside mb-5">
        <li class={styles.li}>
          <a href="/credentials" class="underline">
            Credentials
          </a>
        </li>

        <li class={styles.li}>
          <a href="/admin/accounts" class="underline">
            Accounts
          </a>
        </li>

        <li class={styles.li}>
          <a href="/admin/nodes" class="underline">
            Create or delete nodes
          </a>
        </li>

        <li class={styles.li}>
          <a href="/diffuse" class="underline">
            Diffuse
          </a>
        </li>
      </ul>

      <Typography variant="h3">Variables</Typography>

      <ul class="list-disc list-inside mb-5">
        {variablesToParse.map((v) => (
          <li class={styles.li}>
            <a href={`/api/variables/${v}`} target="blank" class="underline">
              <code>{v}</code>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
