import { ObjectId } from "mongo";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import LocaleDate from "../../islands/LocaleDate.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Pagination from "../../components/Pagination.tsx";
import Typography from "../../components/Typography.tsx";
import RelativeDate from "../../islands/RelativeDate.tsx";
import getQueryParams from "../../utils/getQueryParams.ts";
import Pill, { PillProps } from "../../components/Pill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import NodeEarning from "../../types/collections/nodeEarning.type.ts";
import { countNodeEarnings, getNodeEarnings } from "../../controllers/nodeEarning.controller.ts";

const colors: PillProps["color"][] = ["red", "orange", "yellow", "green", "blue", "purple", "gray"];

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

  if (nodeNumbers.length === 0) return <Typography variant="h3">You don't have any nodes yet.</Typography>;

  return (
    <>
      <div class="flex flex-wrap gap-2 mt-1">
        {nodeNumbers.map((n) => (
          <a href={`nodes/${n}?${relative ? "relative&" : ""}page=`} class="cursor-pointer mr-2">
            <Pill color={colors[(n - 1) % colors.length]}>
              <code>{n}</code>
            </Pill>
          </a>
        ))}
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
            {earnings.map((e) => {
              const nodeNumber = nodes[`${e.node}`];

              return (
                <tr>
                  <td class={styles.td}>
                    <code>{e.epoch}</code>
                  </td>

                  <td class={styles.td}>
                    {relative ? <RelativeDate date={+e.time} /> : <LocaleDate date={+e.time} />}
                  </td>

                  <td class={styles.td}>
                    <Pill color={colors[(nodeNumber - 1) % colors.length]}>
                      <code>{nodeNumber}</code>
                    </Pill>
                  </td>

                  <td class={styles.td}>
                    <code>{e.earning}</code>
                  </td>
                </tr>
              );
            })}
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
