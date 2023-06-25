import { ObjectId } from "mongo";
import State from "../../../types/state.type.ts";
import redirect from "../../../utils/redirect.ts";
import Switch from "../../../components/Switch.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../../utils/numbersString.ts";
import Pagination from "../../../components/Pagination.tsx";
import Typography from "../../../components/Typography.tsx";
import getQueryParams from "../../../utils/getQueryParams.ts";
import NodePill from "../../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../../controllers/node.controller.ts";
import EarningsTable from "../../../components/Nodes/EarningsTable.tsx";
import NodeEarning from "../../../types/collections/nodeEarning.type.ts";
import { getTotalEarnings } from "../../../controllers/nodeEarning.controller.ts";
import { getNodeEarnings, countNodeEarnings } from "../../../controllers/nodeEarning.controller.ts";

interface NodesEarningsProps {
  page: number;
  pages: number[];
  relative: boolean;
  earnings: NodeEarning[];
  thisMonthsEarnings: string;
  lastMonthsEarnings: string;
  nodes: Record<string, number>;
}

const LIMIT = 30;

export const handler: Handlers<NodesEarningsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);

    const relative = "relative" in params;
    const page = Math.ceil(Number(params.page) || 1);

    if ((page === 1 && params.page) || page < 1)
      return redirect("/nodes/earnings" + (relative ? "?relative" : ""));

    const nodes = await getNodes(
      { inactive: { $ne: true }, client: new ObjectId(ctx.state.userId!) },
      { projection: { _id: 1, number: 1 } }
    );
    const nodesIds = nodes.map((node) => node._id);
    const nodesByNumber: NodesEarningsProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earningsCount = await countNodeEarnings({ node: { $in: nodesIds } });
    const pages = Array.from({ length: Math.ceil(earningsCount / LIMIT) }, (_, i) => i + 1);

    if (page > pages.length)
      return redirect(`/nodes/earnings/?${relative ? "relative&" : ""}page=${pages.length}`);

    const earnings = await getNodeEarnings(
      { node: { $in: nodesIds } },
      {
        limit: LIMIT,
        sort: { epoch: -1 },
        skip: (page - 1) * LIMIT,
      }
    );

    const thisMonthsEarnings = toFixedS(await getTotalEarnings(nodesIds, 0), 9);
    const lastMonthsEarnings = toFixedS(await getTotalEarnings(nodesIds, 1), 9);

    return ctx.render({
      page,
      pages,
      earnings,
      relative,
      thisMonthsEarnings,
      lastMonthsEarnings,
      nodes: nodesByNumber,
    });
  },
};

export default function NodesEarnings({ data }: PageProps<NodesEarningsProps>) {
  const { nodes, earnings, pages, page, relative } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  if (nodesCount === 0) return <Typography variant="h3">You don't have any nodes yet.</Typography>;

  return (
    <>
      <Typography variant="h3">
        This month's earnings:&nbsp;
        <code>{data.thisMonthsEarnings}</code>
      </Typography>
      {data.lastMonthsEarnings !== "0" && (
        <Typography variant="h3">
          Last month's earnings:&nbsp;
          <code>{data.lastMonthsEarnings}</code>
        </Typography>
      )}

      <hr class="my-5" />

      <div class="flex flex-wrap items-center gap-3 mt-1">
        {nodeNumbers.map((n, i) => (
          <NodePill nodeNumber={n} relative={relative} class={i === nodesCount - 1 ? "mr-3" : ""} />
        ))}

        <a href={`earnings/?${relative ? "" : "relative&"}page=${page}`}>
          <Switch checked={relative} size={20} color="sky" label="Relative dates" />
        </a>
      </div>

      <hr class="my-5" />

      <EarningsTable earnings={earnings} nodes={nodes} relative={relative} />

      {pages.length > 1 && (
        <Pagination
          maxPages={7}
          pages={pages}
          currentPage={page}
          baseUrl={`earnings/?${relative ? "relative&" : ""}page=`}
        />
      )}
    </>
  );
}
