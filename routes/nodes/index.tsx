import { ObjectId } from "mongo";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Switch from "../../components/Switch.tsx";
import LocaleDate from "../../islands/LocaleDate.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Pagination from "../../components/Pagination.tsx";
import Typography from "../../components/Typography.tsx";
import RelativeDate from "../../islands/RelativeDate.tsx";
import getQueryParams from "../../utils/getQueryParams.ts";
import NodePill from "../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import NodeEarning from "../../types/collections/nodeEarning.type.ts";
import { countNodeEarnings, getNodeEarnings } from "../../controllers/nodeEarning.controller.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface NodesProps {
  page: number;
  pages: number[];
  relative: boolean;
  earnings: NodeEarning[];
  nodes: Record<string, number>;
}

const LIMIT = 30;

export const handler: Handlers<NodesProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);

    const relative = "relative" in params;
    const page = Math.ceil(Number(params.page) || 1);

    if ((page === 1 && params.page) || page < 1) return redirect("/nodes" + (relative ? "?relative" : ""));

    const nodes = await getNodes(
      { inactive: { $ne: true }, client: new ObjectId(ctx.state.userId!) },
      { projection: { _id: 1, number: 1 } }
    );
    const nodesByNumber: NodesProps["nodes"] = {};
    for (const node of nodes) nodesByNumber[`${node._id}`] = node.number;

    const earningsCount = await countNodeEarnings({ node: { $in: nodes.map((node) => node._id) } });
    const pages = Array.from({ length: Math.ceil(earningsCount / LIMIT) }, (_, i) => i + 1);
    const earnings = await getNodeEarnings(
      { node: { $in: nodes.map((node) => node._id) } },
      {
        limit: LIMIT,
        sort: { epoch: -1 },
        skip: (page - 1) * LIMIT,
      }
    );

    return ctx.render({ earnings, nodes: nodesByNumber, pages, page, relative });
  },
};

export default function Nodes({ data }: PageProps<NodesProps>) {
  const { nodes, earnings, pages, page, relative } = data;
  const nodeNumbers = Object.values(nodes);
  const nodesCount = nodeNumbers.length;

  if (nodesCount === 0) return <Typography variant="h3">You don't have any nodes yet.</Typography>;

  return (
    <>
      <div class="flex flex-wrap items-center gap-3 mt-1">
        {nodeNumbers.map((n, i) => (
          <NodePill nodeNumber={n} relative={relative} class={i === nodesCount - 1 ? "mr-3" : ""} />
        ))}

        <a href={`nodes?${relative ? "" : "relative&"}page=${page}`}>
          <Switch checked={relative} size={20} color="sky" label="Relative dates" />
        </a>
      </div>

      <hr class="my-5" />

      <div class="overflow-x-auto">
        <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
          <thead>
            <tr>
              <th class={styles.th}>Epoch</th>
              <th class={styles.th}>Date</th>
              <th class={styles.th}>Node</th>
              <th class={styles.th}>Earning</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e) => (
              <tr>
                <td class={styles.td}>
                  <code>{e.epoch}</code>
                </td>

                <td class={styles.td}>
                  {relative ? <RelativeDate date={+e.time} /> : <LocaleDate date={+e.time} />}
                </td>

                <td class={styles.td}>
                  <NodePill nodeNumber={nodes[`${e.node}`]} relative={relative} />
                </td>

                <td class={styles.td}>
                  <code>{e.earning}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        maxPages={7}
        pages={pages}
        currentPage={page}
        baseUrl={`nodes/?${relative ? "relative&" : ""}page=`}
      />
    </>
  );
}
