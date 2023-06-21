import { Head } from "$fresh/runtime.ts";
import State from "../types/state.type.ts";
import Metas from "../components/Metas.tsx";
import { Chart } from "fresh-charts/mod.ts";
import { BAR_COLORS } from "../constants.ts";
import Typography from "../components/Typography.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { countNodes } from "../controllers/node.controller.ts";
import getNodesStatistics from "../utils/getNodesStatistics.ts";
import { countNodeEarnings } from "../controllers/nodeEarning.controller.ts";

const styles = {
  td: "border border-slate-300 py-2 px-3",
};

interface HomeProps {
  data: number[];
  months: string[];
  nodesCount: number;
  earningsCount: number;
}

export const handler: Handlers<HomeProps, State> = {
  async GET(_, ctx) {
    const nodesCount = await countNodes();
    const earningsCount = await countNodeEarnings();

    const { averageTotalEarningsByMonth, monthsLabels } = await getNodesStatistics();

    return ctx.render({
      nodesCount,
      earningsCount,
      months: monthsLabels,
      data: [...averageTotalEarningsByMonth.values()],
    });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
  const { nodesCount, earningsCount, months, data: chartData } = data;

  return (
    <>
      <Head>
        <Metas title="Home" description="Incognito nodes service" />
      </Head>

      <Typography variant="h1" class="mt-3 mb-10">
        Hosting service for Incognito nodes
      </Typography>

      <table class="table-auto border-collapse border border-slate-400 mb-5">
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

      <Chart
        type="bar"
        options={{ devicePixelRatio: 1 }}
        width={500}
        data={{
          labels: months,
          datasets: [{ data: chartData, backgroundColor: BAR_COLORS, label: "Average monthly earnings per node" }],
        }}
      />
    </>
  );
}
