import dayjs from "dayjs/mod.ts";
import { ObjectId } from "mongo";
import { Chart } from "fresh-charts/mod.ts";
import State from "../../../types/state.type.ts";
import { BAR_COLORS } from "../../../constants.ts";
import Button from "../../../components/Button.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import nameOfMonth from "../../../utils/nameOfMonth.ts";
import { toFixedS } from "../../../utils/numbersString.ts";
import Typography from "../../../components/Typography.tsx";
import getQueryParams from "../../../utils/getQueryParams.ts";
import { getNodes } from "../../../controllers/node.controller.ts";
import EarningsTable from "../../../components/Nodes/EarningsTable.tsx";
import NodeEarning from "../../../types/collections/nodeEarning.type.ts";
import MonthlyEarningsTable from "../../../components/Nodes/MonthlyEarningsTable.tsx";
import { getNodeEarnings, getTotalEarnings } from "../../../controllers/nodeEarning.controller.ts";

interface MonthlyNodesEarningsProps {
  monthsLeft: number;
  earnings: NodeEarning[];
  monthEarnings: string[];
  nodes: Record<string, number>;
}

const MAX_MONTHS = 5;
const LIMIT = 10;

export const handler: Handlers<MonthlyNodesEarningsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);
    const all = "all" in params;

    const nodes = await getNodes(
      { inactive: { $ne: true }, client: new ObjectId(ctx.state.userId!) },
      { projection: { _id: 1, number: 1, createdAt: 1 } }
    );
    const nodesIds = nodes.map((node) => node._id);
    const nodesByNumber: MonthlyNodesEarningsProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earnings = await getNodeEarnings({ node: { $in: nodesIds } }, { limit: LIMIT, sort: { epoch: -1 } });

    const oldestEarning = dayjs(Math.min(...nodes.map((n) => +n.createdAt)));
    const months = dayjs().diff(oldestEarning, "month");

    const monthEarnings: MonthlyNodesEarningsProps["monthEarnings"] = [];
    for (let i = 0; i <= (all ? months : MAX_MONTHS); i++) {
      const total = toFixedS(await getTotalEarnings(nodesIds, i), 9);
      if (total !== "0") monthEarnings.push(total);
      else if (!all) break;
    }

    const monthsLeft = Math.max(0, dayjs().diff(oldestEarning, "month") - monthEarnings.length);

    return ctx.render({
      earnings,
      monthsLeft,
      monthEarnings,
      nodes: nodesByNumber,
    });
  },
};

export default function MonthlyEarnings({ data }: PageProps<MonthlyNodesEarningsProps>) {
  const { nodes, earnings, monthEarnings, monthsLeft } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  if (nodesCount === 0) return <Typography variant="h3">You don't have any nodes yet.</Typography>;

  const numberOfMonths = monthEarnings.length;
  const months = Array.from({ length: numberOfMonths })
    .map((_, i) =>
      dayjs()
        .subtract(i + 1, "month")
        .toDate()
    )
    .map((m) => nameOfMonth(m) + (numberOfMonths >= 13 ? ` ${m.getFullYear()}` : ""));

  return (
    <>
      <Typography variant="h3" class="mb-5">
        Monthly earnings
      </Typography>
      <MonthlyEarningsTable monthEarnings={monthEarnings} />

      <div class="overflow-x-auto">
        <Chart
          type="bar"
          options={{ devicePixelRatio: 1 }}
          width={Math.max(34 * numberOfMonths, 500)}
          data={{
            labels: months.reverse(),
            datasets: [
              {
                data: monthEarnings.reverse().map(Number),
                backgroundColor: BAR_COLORS,
                label: `Average monthly earnings per node.`,
              },
            ],
          }}
        />
      </div>

      {monthsLeft > 0 ? (
        <a href="monthly?all">
          <Button class="mt-3">
            Load earlier {monthsLeft === 1 ? "" : monthsLeft} month{monthsLeft === 1 ? "" : "s"}
          </Button>
        </a>
      ) : (
        <a href="monthly">
          <Button class="mt-3">Show less</Button>
        </a>
      )}

      {/* Latest earnings */}
      <hr class="my-5" />

      <Typography variant="h5" class="mb-1">
        Latest {earnings.length === 1 ? "" : earnings.length} earning{earnings.length > 1 ? "s" : ""}
      </Typography>
      <a href="../earnings?relative">
        <Typography variant="p" class="mb-3 hover:underline after:content-['_↗'] text-blue-600">
          View all
        </Typography>
      </a>

      <EarningsTable baseURL={null} nodes={nodes} earnings={earnings} relative />
    </>
  );
}
