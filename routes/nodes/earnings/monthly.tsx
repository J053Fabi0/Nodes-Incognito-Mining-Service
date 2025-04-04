import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { ObjectId } from "mongo/mod.ts";
import { Head } from "$fresh/runtime.ts";
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
import MonthlyEarningsTable from "../../../components/Nodes/MonthlyEarningsTable.tsx";
import EarningsTable, { EarningForEarningsTable } from "../../../islands/EarningsTable.tsx";
import { getNodeEarnings, getTotalEarnings } from "../../../controllers/nodeEarning.controller.ts";

dayjs.extend(utc);

interface MonthlyNodesEarningsProps {
  isAdmin: boolean;
  monthsLeft: number;
  monthEarnings: string[];
  nodes: Record<string, number>;
  earnings: EarningForEarningsTable[];
}

const MAX_MONTHS = 5;
const LIMIT = 10;

export const handler: Handlers<MonthlyNodesEarningsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);
    const all = "all" in params;
    const isAdmin = ctx.state.isAdmin;

    const nodesQuery: Parameters<typeof getNodes>[0] = { inactive: { $ne: true } };
    if (!isAdmin) nodesQuery.client = new ObjectId(ctx.state.userId!);
    const nodes = await getNodes(nodesQuery, { projection: { _id: 1, number: 1, createdAt: 1 } });
    const nodesIds = nodes.map((node) => node._id);
    const nodesByNumber: MonthlyNodesEarningsProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earnings =
      nodesIds.length > 0
        ? (
            await getNodeEarnings(
              { node: { $in: nodesIds } },
              {
                limit: LIMIT,
                sort: { epoch: -1 },
                projection: { _id: 0, epoch: 1, time: 1, node: 1, earning: 1 },
              }
            )
          ).map((e) => ({ ...e, time: +e.time }))
        : [];

    const oldestEarning = earnings.length > 0 ? dayjs(Math.min(...nodes.map((n) => +n.createdAt))) : dayjs();
    const months = dayjs().utc().diff(oldestEarning, "month");

    const monthEarnings: MonthlyNodesEarningsProps["monthEarnings"] = [];
    if (earnings.length > 0)
      for (let i = 0; i <= (all ? months : MAX_MONTHS); i++) {
        const total = toFixedS(await getTotalEarnings(nodesIds, i), 9);

        if (all) {
          // add all months, even if the earnings are 0
          monthEarnings.push(total);
        } else {
          // add only months with earnings
          if (total !== "0" || i === 0) monthEarnings.push(total);
          // and break when any month has 0 earnings
          else break;
        }
      }

    const monthsLeft = Math.max(0, dayjs().utc().diff(oldestEarning, "month") - monthEarnings.length);

    return ctx.render({
      isAdmin,
      earnings,
      monthsLeft,
      monthEarnings,
      nodes: nodesByNumber,
    });
  },
};

export default function MonthlyEarnings({ data }: PageProps<MonthlyNodesEarningsProps>) {
  const { nodes, earnings, monthEarnings, monthsLeft, isAdmin } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  const head = (
    <Head>
      <link rel="prefetch" href="/nodes" as="document" />
    </Head>
  );

  if (nodesCount === 0 && !isAdmin)
    return (
      <>
        {head}
        <Typography variant="h3">You don't have any nodes yet.</Typography>
      </>
    );

  if (earnings.length === 0)
    return (
      <>
        {head}
        <Typography variant="h3">You don't have any earnings yet.</Typography>
      </>
    );

  const numberOfMonths = monthEarnings.length;
  const months = Array.from({ length: numberOfMonths })
    .map((_, i) => dayjs().utc().subtract(i, "month").startOf("month").toDate())
    .map((m) => nameOfMonth(m) + (numberOfMonths >= 13 ? ` ${m.getFullYear()}` : ""));

  return (
    <>
      {head}

      <Typography variant="h3">Monthly earnings</Typography>

      <div class="flex flex-wrap gap-8 justify-center">
        <MonthlyEarningsTable class="mt-8" monthEarnings={monthEarnings} />

        <div class="overflow-x-auto">
          <Chart
            type="bar"
            options={{ devicePixelRatio: 1 }}
            width={Math.max((numberOfMonths + 1) * 10.38 + 23 * numberOfMonths, 500)}
            data={{
              labels: months.toReversed(),
              datasets: [
                {
                  data: monthEarnings.toReversed().map(Number),
                  backgroundColor: BAR_COLORS,
                  label: "Monthly earnings",
                },
              ],
            }}
          />
        </div>
      </div>

      {monthsLeft > 0 ? (
        <a href="monthly?all">
          <Button class="mt-3">
            Load earlier {monthsLeft === 1 ? "" : monthsLeft} month{monthsLeft === 1 ? "" : "s"}
          </Button>
        </a>
      ) : monthEarnings.length > MAX_MONTHS ? (
        <a href="monthly">
          <Button class="mt-3">Show less</Button>
        </a>
      ) : null}

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
