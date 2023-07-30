import { BAR_COLORS } from "../../constants.ts";
import { type Handlers } from "$fresh/server.ts";
import { renderChart } from "fresh-charts/mod.ts";
import { nodesStatistics } from "../../utils/variables.ts";

export const handler: Handlers = {
  GET() {
    const { averageTotalEarningsByMonth, monthsLabels, nodesCount, earningsCount } = nodesStatistics;

    return renderChart({
      type: "bar",
      data: {
        labels: monthsLabels,
        datasets: [
          {
            backgroundColor: BAR_COLORS,
            label: `Average monthly earnings per node.`,
            data: Object.values(averageTotalEarningsByMonth),
          },
        ],
      },
      options: { devicePixelRatio: 1 },
    });
  },
};
