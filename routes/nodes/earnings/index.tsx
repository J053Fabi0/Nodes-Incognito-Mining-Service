import { ObjectId } from "mongo/mod.ts";
import { Head } from "$fresh/runtime.ts";
import State from "../../../types/state.type.ts";
import redirect from "../../../utils/redirect.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { toFixedS } from "../../../utils/numbersString.ts";
import Pagination from "../../../components/Pagination.tsx";
import Typography from "../../../components/Typography.tsx";
import getQueryParams from "../../../utils/getQueryParams.ts";
import { getNodes } from "../../../controllers/node.controller.ts";
import { EarningForEarningsTable } from "../../../islands/EarningsTable.tsx";
import { getTotalEarnings } from "../../../controllers/nodeEarning.controller.ts";
import EarningsTableAndOptions from "../../../islands/EarningsTableAndOptions.tsx";
import MonthlyEarningsTable from "../../../components/Nodes/MonthlyEarningsTable.tsx";
import { getNodeEarnings, countNodeEarnings } from "../../../controllers/nodeEarning.controller.ts";

interface NodesEarningsProps {
  page: number;
  pages: number[];
  isAdmin: boolean;
  relative: boolean;
  monthEarnings: string[];
  nodes: Record<string, number>;
  earnings: EarningForEarningsTable[];
}

const LIMIT = 30;

export const handler: Handlers<NodesEarningsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);
    const isAdmin = ctx.state.isAdmin;

    const relative = "relative" in params;
    const page = Math.ceil(Number(params.page) || 1);

    if ((page === 1 && params.page) || page < 1)
      return redirect("/nodes/earnings" + (relative ? "?relative" : ""));

    const nodesQuery: Parameters<typeof getNodes>[0] = { inactive: { $ne: true } };
    if (!isAdmin) nodesQuery.client = new ObjectId(ctx.state.userId!);
    const nodes = await getNodes(nodesQuery, { projection: { _id: 1, number: 1 } });
    const nodesIds = nodes.map((node) => node._id);
    const nodesByNumber: NodesEarningsProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earningsCount = await countNodeEarnings({ node: { $in: nodesIds } });
    const pages = Array.from({ length: Math.ceil(earningsCount / LIMIT) }, (_, i) => i + 1);

    if (page > pages.length && pages.length)
      return redirect(`/nodes/earnings?${relative ? "relative&" : ""}page=${pages.length}`);

    const earnings = (
      await getNodeEarnings(
        { node: { $in: nodesIds } },
        {
          limit: LIMIT,
          sort: { epoch: -1 },
          skip: (page - 1) * LIMIT,
          projection: { _id: 0, epoch: 1, time: 1, node: 1, earning: 1 },
        }
      )
    ).map((e) => ({ ...e, time: +e.time }));

    const monthEarnings: string[] = [];
    for (let i = 0; i < 2; i++) {
      const earning = await getTotalEarnings(nodesIds, i);
      if (earning) monthEarnings.push(toFixedS(earning, 2));
      else break;
    }

    return ctx.render({
      page,
      pages,
      isAdmin,
      earnings,
      relative,
      monthEarnings,
      nodes: nodesByNumber,
    });
  },
};

export default function NodesEarnings({ data }: PageProps<NodesEarningsProps>) {
  const { nodes, earnings, pages, page, relative } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  const head = (
    <Head>
      <link rel="prefetch" href="/nodes" as="document" />
    </Head>
  );

  if (nodesCount === 0)
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

  return (
    <>
      {head}

      <MonthlyEarningsTable monthEarnings={data.monthEarnings} horizontal />
      <a href="earnings/monthly" class="w-min block whitespace-nowrap">
        <Typography variant="p" class="my-2 hover:underline after:content-['_↗'] text-blue-600">
          View more
        </Typography>
      </a>

      <hr class="mb-5" />

      <EarningsTableAndOptions
        nodes={nodes}
        earnings={earnings}
        nodeNumbers={nodeNumbers}
        defaultRelative={relative}
      />

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
