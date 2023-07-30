import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../../../env.ts";
import State from "../../../types/state.type.ts";
import redirect from "../../../utils/redirect.ts";
import Paper from "../../../components/Paper.tsx";
import getNodeName from "../../../utils/getNodeName.ts";
import handleError from "../../../utils/handleError.ts";
import Typography from "../../../components/Typography.tsx";
import isResponse from "../../../types/guards/isResponse.ts";
import { getNode } from "../../../controllers/node.controller.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import Button, { getButtonClasses } from "../../../components/Button.tsx";
import deleteDockerAndConfigs from "../../../incognito/deleteDockerAndConfigs.ts";

interface ConfirmDeleteNodeProps {
  number: number;
  isAdmin: boolean;
  clientId: string;
  dockerIndex: number;
}

async function getNodeOrRedirect(ctx: HandlerContext<ConfirmDeleteNodeProps, State>) {
  const { indexOrNumber } = ctx.params;
  const { isAdmin } = ctx.state;
  const clientId = ctx.state.userId!;

  if (!indexOrNumber || isNaN(+indexOrNumber)) return redirect("/nodes/delete");

  const node = await getNode(
    isAdmin ? { dockerIndex: +indexOrNumber } : { number: +indexOrNumber, client: new ObjectId(clientId) },
    { projection: { _id: 0, dockerIndex: 1, number: 1, client: 1 } }
  );

  if (!node) return redirect("/nodes/delete");
  if (!isAdmin && node.client + "" !== clientId) return redirect("/nodes/delete");

  return node;
}

export const handler: Handlers<ConfirmDeleteNodeProps, State> = {
  async GET(_, ctx) {
    const { isAdmin } = ctx.state;
    const clientId = ctx.state.userId!;

    const nodeOrRedirect = await getNodeOrRedirect(ctx);
    if (isResponse(nodeOrRedirect)) return nodeOrRedirect;

    return ctx.render({
      isAdmin,
      clientId,
      number: nodeOrRedirect.number,
      dockerIndex: nodeOrRedirect.dockerIndex,
    });
  },
  async POST(_, ctx) {
    const nodeOrRedirect = await getNodeOrRedirect(ctx);
    if (isResponse(nodeOrRedirect)) return nodeOrRedirect;

    if (IS_PRODUCTION)
      deleteDockerAndConfigs({
        number: nodeOrRedirect.number,
        clientId: nodeOrRedirect.client,
        dockerIndex: nodeOrRedirect.dockerIndex,
      }).catch(handleError);

    return redirect("/nodes/monitor");
  },
};

export default function ConfirmDeleteNode({ data }: PageProps<ConfirmDeleteNodeProps>) {
  const { clientId, dockerIndex, isAdmin, number } = data;

  return (
    <>
      <Typography variant="h2">
        Delete node <code>#{isAdmin ? dockerIndex : number}</code>?
      </Typography>

      {isAdmin && (
        <Typography variant="lead">
          <code>{getNodeName(clientId, number)}</code>
        </Typography>
      )}

      <Typography variant="lead">
        Remebmer that you can always activate it later but the setup fee will be charged again.
      </Typography>
      <Typography variant="lead">
        It might take a few minutes to delete the node form our system. You can check its status in the monitor.
      </Typography>

      <Paper class="bg-yellow-200 p-4 mt-3" shadow="md">
        <Typography variant="h5">⚠️ This won't unstake your node! ⚠️</Typography>
        <Typography variant="lead" class="mt-2">
          If you want to unstake it, do it before deleting it. You can do this in the app under More {">"} Power{" "}
          {">"} Unstake.
        </Typography>
        <Typography variant="lead" class="mt-2">
          You only need to send the unstake transaction once. After that you can delete the node here, no need to
          wait for the unstake to finish.
        </Typography>
        <Typography variant="lead" class="mt-2">
          It'll unstake when it tries to go to committee again, so it might take a few days.
        </Typography>
      </Paper>

      <form method="POST" class="mt-7 flex gap-3">
        <Button color="red" type="submit">
          <Typography variant="h6">Yes, delete</Typography>
        </Button>

        <a href={`/nodes/delete`} class={getButtonClasses("green")}>
          <Typography variant="h6">No, go back</Typography>
        </a>
      </form>
    </>
  );
}
