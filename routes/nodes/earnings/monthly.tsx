import { ObjectId } from "mongo";
import State from "../../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../../utils/numbersString.ts";
import Typography from "../../../components/Typography.tsx";
import getQueryParams from "../../../utils/getQueryParams.ts";
import { getNodes } from "../../../controllers/node.controller.ts";
import EarningsTable from "../../../components/Nodes/EarningsTable.tsx";
import NodeEarning from "../../../types/collections/nodeEarning.type.ts";
import MonthlyEarningsTable from "../../../components/Nodes/MonthlyEarningsTable.tsx";
import { getNodeEarnings, getTotalEarnings } from "../../../controllers/nodeEarning.controller.ts";

interface MonthlyNodesEarningsProps {
  earnings: NodeEarning[];
  monthEarnings: string[];
  nodes: Record<string, number>;
}

const MAX_MONTHS = 10;
const LIMIT = 10;

export const handler: Handlers<MonthlyNodesEarningsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);

    const nodes = await getNodes(
      { inactive: { $ne: true }, client: new ObjectId(ctx.state.userId!) },
      { projection: { _id: 1, number: 1 } }
    );
    const nodesIds = nodes.map((node) => node._id);
    const nodesByNumber: MonthlyNodesEarningsProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earnings = await getNodeEarnings({ node: { $in: nodesIds } }, { limit: LIMIT, sort: { epoch: -1 } });

    const monthEarnings: MonthlyNodesEarningsProps["monthEarnings"] = [];
    for (let i = 0; i <= MAX_MONTHS; i++) {
      const total = toFixedS(await getTotalEarnings(nodesIds, i), 9);
      if (total === "0") break;
      monthEarnings.push(total);
    }

    return ctx.render({
      earnings,
      monthEarnings,
      nodes: nodesByNumber,
    });
  },
};

export default function MonthlyEarnings({ data }: PageProps<MonthlyNodesEarningsProps>) {
  const { nodes, earnings, monthEarnings } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  if (nodesCount === 0) return <Typography variant="h3">You don't have any nodes yet.</Typography>;

  return (
    <>
      <Typography variant="h3" class="mb-5">
        Monthly earnings
      </Typography>
      <MonthlyEarningsTable monthEarnings={monthEarnings} />

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
