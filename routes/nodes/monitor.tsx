import { ObjectId } from "mongo/mod.ts";
import { Head } from "$fresh/runtime.ts";
import Pill from "../../components/Pill.tsx";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import getNodeUrl from "../../utils/getNodeUrl.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { IS_PRODUCTION, WEBSITE_URL } from "../../env.ts";
import NodePill from "../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import { pendingNodesTest } from "../../utils/testingConstants.ts";
import { NewNode, pendingNodes } from "../../incognito/submitNode.ts";
import MonitorCommands from "../../components/Nodes/MonitorCommands.tsx";
import { roleToEmoji } from "../../telegram/handlers/handleTextMessage.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import submitCommand, { CommandResponse } from "../../telegram/submitCommand.ts";
import sortNodes, { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

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

  if (nodesInfo.length === 0)
    return (
      <>
        {head}
        <Typography variant="h3">You don't have any nodes yet.</Typography>
      </>
    );

  return (
    <>
      {head}

      {!isAdmin && (
        <>
          <Typography variant="h1">Monitor</Typography>
          <Typography variant="h3" class="mt-1 mb-5">
            Sorted by epochs to next event and role.
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
            These nodes will soon be initialized. Reload the page periodically to see when they are ready.
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

      <div class="overflow-x-auto">
        <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
          <thead>
            <tr>
              <th class={styles.th}>Node</th>
              <th class={styles.th}>Docker</th>
              <th class={styles.th}>Online</th>
              <th class={styles.th}>Sync</th>
              <th class={styles.th}>Role</th>
              <th class={styles.th}>Shard</th>
              {isAdmin && <th class={styles.th}>Beacon</th>}
            </tr>
          </thead>
          <tbody>
            {nodesInfo.map(([node, { docker, beacon, ...shards }]) => {
              const status = nodesStatus[node];
              const shard = shards[`shard${status.shard}`] ?? 0;
              const sync = status.syncState[0] + status.syncState.slice(1).toLowerCase();
              return (
                <tr>
                  <td class={styles.td}>
                    <NodePill baseURL={null} nodeNumber={isAdmin ? +node : status.number} relative />
                    {isAdmin && (
                      <>
                        <br />
                        <code>
                          Number: <b>{status.number}</b>
                        </code>
                      </>
                    )}
                  </td>

                  <td class={styles.td}>
                    {docker.restarting && isAdmin && (
                      <code class="text-red-600 font-bold">
                        ⚠️ Restarting ⚠️
                        <br />
                      </code>
                    )}
                    <code>{docker.running ? "🟢 Running" : "🔴 Stopped"}</code>
                    <br />
                    <code>
                      {docker.running
                        ? rangeMsToTimeDescription(docker.startedAt, undefined, { short: true })
                        : rangeMsToTimeDescription(docker.finishedAt, undefined, { short: true })}
                    </code>
                  </td>

                  <td class={styles.td}>{status.status === "ONLINE" ? "🟢" : "🔴"}</td>

                  <td class={styles.td}>
                    <code>
                      {sync === "-" || sync === "Latest" ? (
                        sync
                      ) : (
                        <>
                          {sync.split(" ")[0]}
                          <br />
                          {sync.split(" ")[1]}
                        </>
                      )}
                    </code>
                  </td>

                  <td class={styles.td}>
                    <code>
                      {roleToEmoji(status.role)}
                      &nbsp;
                      {status.role[0] + status.role.slice(1).toLowerCase().replace(/_/g, " ")}
                    </code>
                    <br />
                    For <code class="font-semibold">{status.epochsToNextEvent}</code> epochs
                  </td>

                  <td class={styles.td}>
                    {status.shard === "" ? (
                      "-"
                    ) : (
                      <>
                        <NodePill baseURL={null} nodeNumber={+status.shard} relative />
                        {isAdmin && (
                          <code>
                            <br />
                            {shard}
                          </code>
                        )}
                      </>
                    )}
                  </td>

                  {isAdmin && (
                    <td class={styles.td}>
                      {beacon && beacon > 0 ? (
                        <>
                          🟢
                          <br />
                          <code>{beacon}</code>
                        </>
                      ) : (
                        "🔴"
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Typography variant="h5">Node URLs</Typography>

      <ul class={`list-disc list-inside mt-2 ${getTypographyClass("p")}`}>
        {nodesUrl.map((url) => (
          <li>
            <a href={url}>{url}</a>
          </li>
        ))}
      </ul>

      {!isAdmin && (
        <Typography variant="smallP">
          * Nodes become online only when needed. They are offline most of the time.
        </Typography>
      )}
    </>
  );
}
