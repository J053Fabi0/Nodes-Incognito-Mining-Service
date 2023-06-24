import { Head } from "$fresh/runtime.ts";
import { asset } from "$fresh/runtime.ts";
import State from "../types/state.type.ts";
import Metas from "../components/Metas.tsx";
import { Chart } from "fresh-charts/mod.ts";
import { BAR_COLORS } from "../constants.ts";
import { toFixedS } from "../utils/numbersString.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { countNodes } from "../controllers/node.controller.ts";
import getNodesStatistics from "../utils/getNodesStatistics.ts";
import { countNodeEarnings } from "../controllers/nodeEarning.controller.ts";
import Typography, { getTypographyClass } from "../components/Typography.tsx";

const styles = {
  td: "border border-slate-300 py-2 px-3",
};

interface HomeProps {
  data: number[];
  months: string[];
  loggedIn: boolean;
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
      loggedIn: Boolean(ctx.state.user),
      data: [...averageTotalEarningsByMonth.values()],
    });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
  const { nodesCount, earningsCount, months, data: chartData } = data;
  const totalAverage = chartData.reduce((acc, curr) => acc + curr, 0) / chartData.length;
  const liStyle = getTypographyClass("lead");

  return (
    <>
      <Head>
        <Metas title="Hosting nodes Incognito" description="Incognito nodes service" />
        <link href={asset("/styles/checkUL.css")} rel="stylesheet" />
      </Head>

      <Typography variant="h1" class="mt-3 mb-5">
        Hosting service for Incognito nodes
      </Typography>

      <ul class="list-disc list-inside checkUL mb-5">
        <li class={liStyle}>You provide the stake, we the infrastructure.</li>
        <li class={liStyle}>Earnings and stake in your control, we don't ask for any private keys.</li>
        <li class={liStyle}>
          Monthly fee is based on earnings: 10%, no more.
          <li class={liStyle}>5 USD for each node's initial setup.</li>
        </li>
      </ul>

      <Typography variant="h2" class="mb-5">
        Some statistics
      </Typography>

      <table class="table-auto border-collapse border border-slate-400 mb-5">
        <tbody>
          <tr>
            <td class={styles.td}>
              <Typography variant="h4">Hosted nodes</Typography>
            </td>
            <td class={styles.td}>
              <Typography variant="h4">
                <code>{nodesCount}</code>
              </Typography>
            </td>
          </tr>
          <tr>
            <td class={styles.td}>
              <Typography variant="h4">Total earnings count</Typography>
            </td>
            <td class={styles.td}>
              <Typography variant="h4">
                <code>{earningsCount}</code>
              </Typography>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="overflow-x-auto">
        <Chart
          type="bar"
          options={{ devicePixelRatio: 1 }}
          width={500}
          data={{
            labels: months,
            datasets: [
              {
                data: chartData,
                backgroundColor: BAR_COLORS,
                label: `Average monthly earnings per node. ${toFixedS(totalAverage, 2)} final average.`,
              },
            ],
          }}
        />
      </div>
    </>
  );
}
