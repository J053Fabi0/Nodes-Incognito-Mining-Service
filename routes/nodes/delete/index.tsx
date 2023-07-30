import { ObjectId } from "mongo/mod.ts";
import State from "../../../types/state.type.ts";
import Button from "../../../components/Button.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import getNodeName from "../../../utils/getNodeName.ts";
import Node from "../../../types/collections/node.type.ts";
import Typography from "../../../components/Typography.tsx";
import { getNodes } from "../../../controllers/node.controller.ts";

interface DeleteNodesProps {
  nodes: Pick<Node, "number" | "dockerIndex">[];
  isAdmin: boolean;
  clientId: string;
}

export const handler: Handlers<DeleteNodesProps, State> = {
  async GET(_, ctx) {
    const clientId = ctx.state.userId!;
    const nodes = await getNodes(
      { client: new ObjectId(clientId), inactive: false },
      { projection: { number: 1, dockerIndex: 1, _id: 0 } }
    );

    return ctx.render({
      nodes,
      clientId,
      isAdmin: ctx.state.isAdmin,
    });
  },
};

export default function DeleteNodes({ data }: PageProps<DeleteNodesProps>) {
  const { clientId, nodes, isAdmin } = data;

  return (
    <>
      <Typography variant="h1">Delete nodes</Typography>

      <Typography variant="lead">After deleting a node you won't have to pay its monthly fee.</Typography>
      <Typography variant="lead">
        You can always activate them later but the setup fee will be charged again.
      </Typography>

      <table class="mt-3">
        <tbody>
          {nodes.map((node) => (
            <tr>
              <td class="py-2 pr-3 text-left">
                <Typography>
                  Node <code>#{isAdmin ? getNodeName(clientId, node.number) : node.number}</code>
                </Typography>
              </td>
              <td>
                <a href={`/nodes/delete/${isAdmin ? node.dockerIndex : node.number}`}>
                  <Button color="red">Delete</Button>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
