import { Head } from "$fresh/runtime.ts";
import { asset } from "$fresh/runtime.ts";
import State from "../types/state.type.ts";
import { Chart } from "fresh-charts/mod.ts";
import { BAR_COLORS } from "../constants.ts";
import { toFixedS } from "../utils/numbersString.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { nodesStatistics } from "../utils/variables.ts";
import { getButtonClasses } from "../components/Button.tsx";
import { countNodes } from "../controllers/node.controller.ts";
import { countNodeEarnings } from "../controllers/nodeEarning.controller.ts";
import Typography, { getTypographyClass } from "../components/Typography.tsx";

const styles = {
  li: getTypographyClass("lead"),
  td: "border border-slate-300 py-2 px-3",
};

interface HomeProps {
  data: number[];
  months: string[];
  isAdmin: boolean;
  loggedIn: boolean;
  nodesCount: number;
  earningsCount: number;
}

export const handler: Handlers<HomeProps, State> = {
  GET(_, ctx) {
    const { averageTotalEarningsByMonth, monthsLabels, nodesCount, earningsCount } = nodesStatistics;

    return ctx.render({
      nodesCount,
      earningsCount,
      months: monthsLabels,
      isAdmin: ctx.state.isAdmin,
      loggedIn: Boolean(ctx.state.user),
      data: Object.values(averageTotalEarningsByMonth),
    });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
  const { nodesCount, earningsCount, months, data: chartData, loggedIn } = data;
  const totalAverage = chartData.reduce((acc, curr) => acc + curr, 0) / chartData.length;

  return (
    <>
      <Head>
        <link href={asset("/styles/checkUL.css")} rel="stylesheet" />
        {loggedIn ? (
          <link rel="prefetch" href="/nodes" as="document" />
        ) : (
          <link rel="prefetch" href="/signin" as="document" />
        )}
      </Head>

      <Typography variant="h1" class="mt-3 mb-5">
        Hosting service for Incognito nodes
      </Typography>

      <ul class="list-disc list-inside checkUL mb-3">
        <li class={styles.li}>You provide the stake, we the infrastructure.</li>
        <li class={styles.li}>Earnings and stake in your control, we don't ask for any private keys.</li>
        <li class={styles.li}>Monthly fee is based on earnings: 10%, no more.</li>
        <li class={styles.li}>5 USD for each node's initial setup.</li>
      </ul>

      <p class="mb-5">
        <a href={loggedIn ? "/nodes" : "/signin?create"} class={getButtonClasses("green")}>
          {loggedIn ? "Your nodes" : "Create an account"}
        </a>
      </p>

      <Typography variant="h2" class="mb-5">
        Some statistics from all our hosted nodes
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

          <tr>
            <td class={styles.td}>
              <Typography variant="h4">Average monthly earnings per node</Typography>
            </td>
            <td class={styles.td}>
              <Typography variant="h4">
                <code>{toFixedS(totalAverage, 2)} PRV</code>
              </Typography>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="overflow-x-auto">
        <Chart
          type="bar"
          width={500}
          options={{ devicePixelRatio: 1 }}
          data={{
            labels: months,
            datasets: [
              {
                data: chartData,
                backgroundColor: BAR_COLORS,
                label: `Average monthly earnings per node.`,
              },
            ],
          }}
        />
      </div>
    </>
  );
}
