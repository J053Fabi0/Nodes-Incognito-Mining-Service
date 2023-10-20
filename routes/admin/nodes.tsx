import { ObjectId } from "mongo/mod.ts";
import { FiTrash2 } from "react-icons/fi";
import { IS_PRODUCTION } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import { BsFillPlayFill } from "react-icons/bs";
import Button from "../../components/Button.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import submitNode from "../../incognito/submitNode.ts";
import Node from "../../types/collections/node.type.ts";
import deleteDockerAndConfigs from "../../incognito/deleteDockerAndConfigs.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import { aggregateNode, getNodeById } from "../../controllers/node.controller.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
  li: `${getTypographyClass("lead")}`,
} as const;

type NodeWithClient = Pick<Node, "_id" | "dockerIndex" | "inactive" | "number"> & {
  client: { _id: ObjectId; name: string };
};
interface AdminNodesProps {
  nodes: NodeWithClient[];
}
enum Action {
  ACTIVATE = "activate",
  DELETE = "delete",
}

export const handler: Handlers<AdminNodesProps, State> = {
  async GET(_, ctx) {
    const nodes = (
      await aggregateNode([
        { $match: {} },
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        // make client an object instead of an array
        { $unwind: "$client" },
        {
          $project: {
            number: 1,
            inactive: 1,
            dockerIndex: 1,
            client: {
              _id: 1,
              name: 1,
            },
          },
        },
      ])
    ).sort((a, b) => a.dockerIndex - b.dockerIndex) as unknown as NodeWithClient[];

    return ctx.render({ nodes });
  },

  async POST(req) {
    const form = await req.formData();

    const [action] = [...form.keys()] as [Action | undefined];
    if (!action || !Object.values(Action).includes(action)) return new Response("No action", { status: 400 });

    const nodeId = form.get(action);
    if (!nodeId || typeof nodeId !== "string") return new Response("No node id", { status: 400 });

    const node = await getNodeById(nodeId);
    if (!node) return new Response("Node not found", { status: 404 });

    if (IS_PRODUCTION) {
      if (action === Action.DELETE)
        await deleteDockerAndConfigs({
          number: node.number,
          clientId: node.client,
          dockerIndex: node.dockerIndex,
        });
      else if (action === Action.ACTIVATE)
        await submitNode({
          cost: 0,
          nodeId: node._id,
          number: node.number,
          rcpPort: node.rcpPort,
          clientId: node.client,
          validator: node.validator,
          dockerIndex: node.dockerIndex,
          validatorPublic: node.validatorPublic,
        });
    }

    return redirect(req.url);
  },
};

export default function AdminNodes({ data }: PageProps<AdminNodesProps>) {
  const { nodes } = data;

  const nodesPerClient: Record<string, { number: number; name: string } | undefined> = {};

  for (const node of nodes) {
    const { _id } = node.client;
    if (!nodesPerClient[`${_id}`]) nodesPerClient[`${_id}`] = { number: 0, name: node.client.name };
    nodesPerClient[`${_id}`]!.number++;
  }

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Nodes ({nodes.length})
      </Typography>

      <form method="post">
        <div class="overflow-x-auto">
          <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
            <thead>
              <tr>
                <th class={styles.th}>Client</th>
                <th class={styles.th}>Number</th>
                <th class={styles.th}>Docker index</th>
                <th class={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr>
                  <td class={styles.td}>
                    {node.client.name} ({nodesPerClient[`${node.client._id}`]!.number})
                    <br />
                    <code>{`${node.client._id}`}</code>
                  </td>

                  <td class={styles.td}>
                    <code>{node.number}</code>
                  </td>

                  <td class={styles.td}>{node.dockerIndex}</td>

                  <td class={styles.td}>
                    {node.inactive ? (
                      <Button type="submit" color="green" name={Action.ACTIVATE} value={`${node._id}`}>
                        <BsFillPlayFill />
                      </Button>
                    ) : (
                      <Button type="submit" color="red" name={Action.DELETE} value={`${node._id}`}>
                        <FiTrash2 />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>

      <ul class="list-disc list-inside mb-5">
        {Object.entries(nodesPerClient)
          .sort((a, b) => b[1]!.number - a[1]!.number)
          .map(([clientId, nodes]) => (
            <li class={styles.li} title={clientId}>
              {nodes!.name} - {nodes!.number} nodes
            </li>
          ))}
      </ul>
    </>
  );
}
