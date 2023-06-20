import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Metas from "../components/Metas.tsx";
import Typography from "../components/Typography.tsx";
import { countNodes } from "../controllers/node.controller.ts";
import { countNodeEarnings } from "../controllers/nodeEarning.controller.ts";
import State from "../types/state.type.ts";

const styles = {
  td: "border border-slate-300 py-2 px-3",
};

interface HomeProps {
  nodesCount: number;
  earningsCount: number;
}

export const handler: Handlers<HomeProps, State> = {
  async GET(_, ctx) {
    const nodesCount = await countNodes();
    const earningsCount = await countNodeEarnings();

    return ctx.render({ nodesCount, earningsCount });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
  const { nodesCount, earningsCount } = data;

  return (
    <>
      <Head>
        <Metas title="Home" description="Incognito nodes service" />
      </Head>

      <Typography variant="h1" class="mb-5">
        Hosting service for Incognito nodes
      </Typography>

      <table class="table-auto border-collapse border border-slate-400">
        <tbody>
          <tr>
            <td class={styles.td}>
              <Typography variant="h3">Hosted nodes</Typography>
            </td>
            <td class={styles.td}>
              <Typography variant="h3">
                <code>{nodesCount}</code>
              </Typography>
            </td>
          </tr>
          <tr>
            <td class={styles.td}>
              <Typography variant="h3">Total earnings count</Typography>
            </td>
            <td class={styles.td}>
              <Typography variant="h3">
                <code>{earningsCount}</code>
              </Typography>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
