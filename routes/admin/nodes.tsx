import { FiTrash2 } from "react-icons/fi";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import { BsFillPlayFill } from "react-icons/bs";
import Button from "../../components/Button.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Node from "../../types/collections/node.type.ts";
import Typography from "../../components/Typography.tsx";
import { getNodeById, getNodes } from "../../controllers/node.controller.ts";
import deleteDockerAndConfigs from "../../incognito/deleteDockerAndConfigs.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
} as const;

interface AdminNodesProps {
  nodes: Node[];
}
enum Action {
  ACTIVATE = "activate",
  DELETE = "delete",
}

export const handler: Handlers<AdminNodesProps, State> = {
  async GET(_, ctx) {
    const nodes = (await getNodes()).sort((a, b) => a.dockerIndex - b.dockerIndex);

    return ctx.render({ nodes });
  },
  async POST(req) {
    const form = await req.formData();

    const nodeId = form.get(Action.DELETE);
    if (!nodeId || typeof nodeId !== "string") return new Response("No node id", { status: 400 });

    const node = await getNodeById(nodeId);
    if (!node) return new Response("Node not found", { status: 404 });

    await deleteDockerAndConfigs({
      number: node.number,
      clientId: node.client,
      dockerIndex: node.dockerIndex,
    });

    return redirect(req.url);
  },
};

export default function AdminNodes({ data }: PageProps<AdminNodesProps>) {
  const { nodes } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Nodes
      </Typography>

      <form method="post">
        <div class="overflow-x-auto">
          <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
            <thead>
              <tr>
                <th class={styles.th}>Name</th>
                <th class={styles.th}>Number</th>
                <th class={styles.th}>Docker index</th>
                <th class={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr>
                  <td class={styles.td}>
                    <code>{node.name}</code>
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
    </>
  );
}
