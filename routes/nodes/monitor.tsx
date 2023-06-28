import { ObjectId } from "mongo/mod.ts";
import { Head } from "$fresh/runtime.ts";
import { IS_PRODUCTION } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import { BsFillPlayFill } from "react-icons/bs";
import Button from "../../components/Button.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import NodePill from "../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import submitCommand, { CommandResponse, commands } from "../../telegram/submitCommand.ts";
import sortNodes, { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface MonitorProps {
  isAdmin: boolean;
  commandResponse?: CommandResponse;
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
}

// Only change the last boolean value if you want to test
const testingClient = !IS_PRODUCTION && false;

export const handler: Handlers<MonitorProps, State> = {
  async GET(_, ctx) {
    const { isAdmin, supplanting, userId, commandResponse } = ctx.state;

    // if it's an admin and not supplanting, get all nodes
    const shouldGetAll = (isAdmin || supplanting) && !testingClient;

    const nodes = shouldGetAll
      ? null
      : await getNodes({ client: new ObjectId(userId!) }, { projection: { dockerIndex: 1, _id: 0 } });

    const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } =
      shouldGetAll || nodes!.length
        ? await sortNodes(shouldGetAll ? [] : nodes!.map((n) => n.dockerIndex))
        : { nodesInfoByDockerIndex: [], nodesStatusByDockerIndex: {} };

    return ctx.render({ nodesInfo, nodesStatus, isAdmin: shouldGetAll, commandResponse });
  },

  async POST(req, ctx) {
    if (!ctx.state.isAdmin) return redirect(req.url);

    const form = await req.formData();
    const command = form.get("command")?.toString();
    if (!command) return handler.GET ? handler.GET(req, ctx) : redirect(req.url);

    ctx.state.commandResponse = (await submitCommand(command))[0];

    return handler.GET ? handler.GET(req, ctx) : redirect(req.url);
  },
};

export default function Monitor({ data }: PageProps<MonitorProps>) {
  const { nodesInfo, nodesStatus, isAdmin, commandResponse } = data;

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

      {isAdmin && (
        <>
          <form method="post">
            {commands.resolved.slice(0, 5).map((m) => (
              <div class="flex gap-3 mt-1 mb-5">
                <Typography variant="lead">
                  <code>{m}</code>
                </Typography>

                <Button type="submit" class="py-0 px-2" name="command" value={m}>
                  <BsFillPlayFill size={20} />
                </Button>
              </div>
            ))}
          </form>
          <form method="post">
            <input
              type="text"
              name="command"
              placeholder="Command"
              class="mb-2 p-2 border border-gray-300 rounded w-full"
            />
          </form>
          {commandResponse && (
            <>
              <Typography variant="lead">
                <div
                  dangerouslySetInnerHTML={{
                    __html: (commandResponse.successful ? commandResponse.response : commandResponse.error)
                      // replace all newlines with <br />
                      .replace(/\n/g, "<br />"),
                  }}
                />
              </Typography>
              <div class="mb-2" />
            </>
          )}
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
                    <NodePill baseURL={null} nodeNumber={+node} relative />
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
                    <code>{status.role[0] + status.role.slice(1).toLowerCase()}</code>
                    <br />
                    For <code>{status.epochsToNextEvent}</code> epochs
                  </td>

                  <td class={styles.td}>
                    <NodePill baseURL={null} nodeNumber={+status.shard} relative />
                    {isAdmin && (
                      <code>
                        <br />
                        {shard}
                      </code>
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
    </>
  );
}
