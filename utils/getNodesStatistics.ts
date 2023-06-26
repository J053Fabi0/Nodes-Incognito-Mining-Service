import dayjs from "dayjs/mod.ts";
import nameOfMonth from "./nameOfMonth.ts";
import Node from "../types/collections/node.type.ts";
import { getNodes } from "../controllers/node.controller.ts";
import NodeEarning from "../types/collections/nodeEarning.type.ts";
import { getNodeEarnings } from "../controllers/nodeEarning.controller.ts";

const nodesProjection = { projection: { createdAt: 1 } };
const nodeEarnignsProjection = { projection: { time: 1, earning: 1, node: 1 } };
type ProjectedNode = Pick<Node, "_id" | keyof (typeof nodesProjection)["projection"]>;
type ProjectedNodeEarning = Pick<NodeEarning, "_id" | keyof (typeof nodeEarnignsProjection)["projection"]>;

export default async function getNodesStatistics() {
  const months = Array.from({ length: 5 })
    .map((_, i) =>
      dayjs()
        .subtract(i + 1, "month")
        .startOf("month")
        .toDate()
    )
    .reverse();
  const [to] = months.slice(-1);
  const [from] = months;

  const earnings = (await getNodeEarnings(
    { time: { $gte: from } },
    nodeEarnignsProjection
  )) as ProjectedNodeEarning[];

  const nodes = (await getNodes({ createdAt: { $lte: to } }, nodesProjection)) as ProjectedNode[];

  const nodesByMonth = new Map<Date, ProjectedNode[]>();
  for (const month of months) {
    // if the node was created before the month, add it to the array.
    for (const node of nodes)
      if (dayjs(node.createdAt).isBefore(month)) {
        if (!nodesByMonth.has(month)) nodesByMonth.set(month, [node]);
        else nodesByMonth.get(month)?.push(node);
      }
  }

  const earningsByMonth = new Map<Date, (ProjectedNode & { earnings: number[]; total: number })[]>();
  for (const month of months) {
    if (!nodesByMonth.has(month)) continue;
    const monthNumber = month.getMonth();

    for (const node of nodesByMonth.get(month)!) {
      const nodeId = `${node._id}`;
      const nodeEarnings = earnings
        .filter((e) => e.time.getMonth() === monthNumber && `${e.node}` === nodeId)
        .map((e) => e.earning);
      const nodeWithEarnings = {
        ...node,
        earnings: nodeEarnings,
        total: nodeEarnings.reduce((sum, e) => sum + e, 0),
      };

      if (!earningsByMonth.has(month)) earningsByMonth.set(month, [nodeWithEarnings]);
      else earningsByMonth.get(month)?.push(nodeWithEarnings);
    }
  }

  const averageTotalEarningsByMonth = new Map<Date, number>();
  for (const month of months) {
    const nodes = earningsByMonth.get(month);
    if (!earningsByMonth.has(month) || !nodes || nodes.length === 0) continue;

    for (const node of nodes) {
      const average = averageTotalEarningsByMonth.get(month) ?? 0;
      averageTotalEarningsByMonth.set(month, average + node.total);
    }

    const average = averageTotalEarningsByMonth.get(month) ?? 0;
    if (average) averageTotalEarningsByMonth.set(month, average / nodes.length);
  }

  const monthsLabels = [...averageTotalEarningsByMonth.keys()].map((month) => nameOfMonth(month));

  return {
    monthsLabels,
    nodesByMonth,
    earningsByMonth,
    averageTotalEarningsByMonth,
  };
}
