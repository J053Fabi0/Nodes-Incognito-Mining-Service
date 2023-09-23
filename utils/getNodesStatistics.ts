import moment from "moment";
import nameOfMonth, { Month } from "./nameOfMonth.ts";
import { countNodes, getNodes } from "../controllers/node.controller.ts";
import { countNodeEarnings, getNodeEarnings } from "../controllers/nodeEarning.controller.ts";

interface NormalizedNode {
  createdAt: number;
  _id: string;
}

export type NodesStatistics = {
  nodesCount: number;
  monthsLabels: Month[];
  earningsCount: number;
  nodesByMonth: Record<string, NormalizedNode[]>;
  averageTotalEarningsByMonth: Record<string, number>;
  earningsByMonth: Record<string, (NormalizedNode & { earnings: number[]; total: number })[]>;
};

export default async function getNodesStatistics(): Promise<NodesStatistics> {
  const months = Array.from({ length: 5 })
    .map((_, i) =>
      moment()
        .utc()
        .subtract(i + 1, "month")
        .startOf("month")
        .valueOf()
    )
    .reverse();
  const to = new Date(months.slice(-1)[0]);
  const from = new Date(months[0]);

  const earnings = await getNodeEarnings(
    { time: { $gte: from } },
    { projection: { time: 1, earning: 1, node: 1 } }
  );

  const nodes = await getNodes({ createdAt: { $lte: to } }, { projection: { createdAt: 1, _id: 1 } });

  const nodesByMonth: NodesStatistics["nodesByMonth"] = {};
  for (const month of months) {
    // if the node was created before the month, add it to the array.
    for (const node of nodes)
      if (moment(node.createdAt).isBefore(month)) {
        const normalized = { createdAt: +node.createdAt, _id: `${node._id}` };
        if (!nodesByMonth[month]) nodesByMonth[month] = [normalized];
        else nodesByMonth[month].push(normalized);
      }
  }

  const earningsByMonth: NodesStatistics["earningsByMonth"] = {};
  for (const month of months) {
    if (!nodesByMonth[month]) continue;
    const monthNumber = new Date(month).getMonth();

    for (const node of nodesByMonth[month]!) {
      const nodeId = `${node._id}`;
      const nodeEarnings = earnings
        .filter((e) => e.time.getMonth() === monthNumber && `${e.node}` === nodeId)
        .map((e) => e.earning);
      const nodeWithEarnings = {
        ...node,
        earnings: nodeEarnings,
        total: nodeEarnings.reduce((sum, e) => sum + e, 0),
      };

      if (!earningsByMonth[month]) earningsByMonth[month] = [nodeWithEarnings];
      else earningsByMonth[month].push(nodeWithEarnings);
    }
  }

  const averageTotalEarningsByMonth: NodesStatistics["averageTotalEarningsByMonth"] = {};
  for (const month of months) {
    const nodes = earningsByMonth[month];
    if (!earningsByMonth[month] || !nodes || nodes.length === 0) continue;

    for (const node of nodes) {
      const average = averageTotalEarningsByMonth[month] ?? 0;
      averageTotalEarningsByMonth[month] = average + node.total;
    }

    const average = averageTotalEarningsByMonth[month] ?? 0;
    if (average) averageTotalEarningsByMonth[month] = average / nodes.length;
  }

  const monthsLabels = Object.keys(averageTotalEarningsByMonth).map((month) => nameOfMonth(new Date(+month)));

  return {
    monthsLabels,
    nodesByMonth,
    earningsByMonth,
    averageTotalEarningsByMonth,
    earningsCount: await countNodeEarnings(),
    nodesCount: await countNodes({ inactive: { $ne: true } }),
  };
}
