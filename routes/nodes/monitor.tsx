import { ObjectId } from "mongo/mod.ts";
import { Head } from "$fresh/runtime.ts";
import Pill from "../../components/Pill.tsx";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import getNodeUrl from "../../utils/getNodeUrl.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { IS_PRODUCTION, WEBSITE_URL } from "../../env.ts";
import NodePill from "../../components/Nodes/NodePill.tsx";
import submitCommand from "../../telegram/submitCommand.ts";
import { getNodes } from "../../controllers/node.controller.ts";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { pendingNodesTest } from "../../utils/testingConstants.ts";
import MonitorTable from "../../components/Nodes/MonitorTable.tsx";
import { NewNode, pendingNodes } from "../../incognito/submitNode.ts";
import { CommandResponse } from "../../telegram/submitCommandUtils.ts";
import MonitorCommands from "../../components/Nodes/MonitorCommands.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import sortNodes, { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

interface MonitorProps {
  isAdmin: boolean;
  /** number, URL */
  nodesUrl: string[];
  pendingNodes: NewNode[];
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
  commandResponse?: CommandResponse | null;
}

// Only change the last boolean value if you want to test
const testingClient = !IS_PRODUCTION && false;
const testingPendingNodes = !IS_PRODUCTION && false;
const URL = `${WEBSITE_URL}/nodes/monitor`;

export const handler: Handlers<MonitorProps, State> = {
  async GET(_, ctx) {
    const { isAdmin, supplanting, userId, commandResponse } = ctx.state;

    // if it's an admin and not supplanting, get all nodes
    const shouldGetAll = (isAdmin || supplanting) && !testingClient;

    const nodesQuery: Parameters<typeof getNodes>[0] = shouldGetAll
      ? { inactive: false }
      : { client: new ObjectId(userId!), inactive: false };
    const nodes = await getNodes(nodesQuery, { projection: { _id: 0, dockerIndex: 1, name: 1 } });

    const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } = nodes.length
      ? await sortNodes(nodes.map((n) => n.dockerIndex))
      : { nodesInfoByDockerIndex: [], nodesStatusByDockerIndex: {} };

    // admin can see all pending nodes, client can only see their own
    const userPendingNodes = isAdmin ? pendingNodes : pendingNodes.filter((n) => `${n.clientId}` === userId!);

    const nodesUrl: MonitorProps["nodesUrl"] = nodes.map((n) => getNodeUrl(n.name));

    return ctx.render({
      nodesUrl,
      nodesInfo,
      nodesStatus,
      commandResponse,
      isAdmin: shouldGetAll,
      pendingNodes: testingPendingNodes ? pendingNodesTest : userPendingNodes,
    });
  },

  async POST(req, ctx) {
    if (!ctx.state.isAdmin) return redirect(URL);

    const form = await req.formData();

    const command = form.get("command")?.toString();
    const submit = form.get("submit")?.toString() || "submit";
    if (!command) return redirect(URL);

    if (submit === "noWait") {
      submitCommand(command);
      ctx.state.session.set("commandResponse", null);
    } else {
      const [commandResponse] = await submitCommand(command);
      ctx.state.session.set("commandResponse", commandResponse);
    }

    return redirect(URL);
  },
};

export default function Monitor({ data, route }: PageProps<MonitorProps>) {
  const { nodesInfo, nodesStatus, isAdmin, commandResponse, pendingNodes, nodesUrl } = data;

  const head = (
    <Head>
      <link rel="prefetch" href="/nodes" as="document" />
    </Head>
  );

  if (nodesInfo.length === 0 && pendingNodes.length === 0)
    return (
      <>
        {head}
        <Typography variant="h3">You don't have any nodes yet.</Typography>
      </>
    );

  return (
    <div class="relative">
      {head}

      {!isAdmin && (
        <>
          <Typography variant="h1">Monitor</Typography>
          <Typography variant="h4" class="mt-1 mb-1">
            Sorted by epochs to next event and role.
          </Typography>

          <Typography variant="smallP" class="mb-3">
            Nodes become online and get beacon and shard files when they are close to committee. Don't worry if
            they are offline most of the time.
          </Typography>
        </>
      )}

      {isAdmin && <MonitorCommands route={route} commandResponse={commandResponse} />}

      {pendingNodes.length > 0 && (
        <>
          <Typography variant="h4" class="mt-5">
            Pending nodes
          </Typography>
          <Typography variant="p" class="mb-2">
            These nodes will be initialized soon. Reload the page periodically to see when they are ready.
          </Typography>

          <div class="flex flex-wrap items-center gap-3 mb-5">
            {pendingNodes.map(({ number }) =>
              typeof number === "number" ? (
                <NodePill nodeNumber={number} baseURL={null} relative />
              ) : (
                <Pill color="gray">Number yet to be determined</Pill>
              )
            )}
          </div>
        </>
      )}

      {nodesInfo.length > 0 && <MonitorTable isAdmin={isAdmin} nodesInfo={nodesInfo} nodesStatus={nodesStatus} />}

      <Typography variant="h5">Node URLs</Typography>

      <ul class={`list-disc list-inside mt-2 ${getTypographyClass("p")}`}>
        {nodesUrl.map((url) => (
          <li>{url}</li>
        ))}
      </ul>

      {Object.values(nodesStatus).some((a) => a.role === "NOT_STAKED") && <AfterYouPay monitor class="mt-4" />}

      {!isAdmin && (
        <Typography variant="smallP" class="mt-3">
          * Nodes become online only when needed. They are offline most of the time.
        </Typography>
      )}
    </div>
  );
}
