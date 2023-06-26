import { ObjectId } from "mongo";
import State from "../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import NodePill from "../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import sortNodes, { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface NodesStatusProps {
  isAdmin: boolean;
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
}

export const handler: Handlers<NodesStatusProps, State> = {
  async GET(_, ctx) {
    const nodes = await getNodes(
      { _id: new ObjectId(ctx.state.userId!) },
      { projection: { dockerIndex: 1, _id: 0 } }
    );

    const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } = await sortNodes(
      nodes.map((n) => n.dockerIndex)
    );

    return ctx.render({ nodesInfo, nodesStatus, isAdmin: ctx.state.isAdmin });
  },
};

export default function NodesStatus({ data }: PageProps<NodesStatusProps>) {
  const { nodesInfo, nodesStatus, isAdmin } = data;
  return (
    <>
      <Typography variant="h1" class="mt-3">
        Nodes status.
      </Typography>
      <Typography variant="h3" class="mt-1 mb-5">
        Sorted by docker index.
      </Typography>

      <div class="overflow-x-auto">
        <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
          <thead>
            <tr>
              <th class={styles.th}>Node</th>
              <th class={styles.th}>Docker</th>
              <th class={styles.th}>Online</th>
              <th class={styles.th}>Sync state</th>
              <th class={styles.th}>Role</th>
              <th class={styles.th}>Shard</th>
              {isAdmin && <th class={styles.th}>Beacon</th>}
            </tr>
          </thead>
          <tbody>
            {nodesInfo.map(([node, { docker, beacon }]) => {
              const status = nodesStatus[node];
              return (
                <tr>
                  <td class={styles.td}>
                    <NodePill baseURL={null} nodeNumber={+node} relative />
                  </td>

                  <td class={styles.td}>
                    <code>{docker.running ? "🟢 Running" : "🔴 Stopped"}</code>
                    <br />
                    {docker.restarting && isAdmin && (
                      <code class="text-red-600">
                        "Restarting ⚠️"
                        <br />
                      </code>
                    )}
                    <code>
                      {docker.running
                        ? rangeMsToTimeDescription(docker.startedAt, undefined, { short: true })
                        : rangeMsToTimeDescription(docker.finishedAt, undefined, { short: true })}
                    </code>
                  </td>

                  <td class={styles.td}>
                    <code>{status.status === "ONLINE" ? "🟢" : "🔴"}</code>
                  </td>

                  <td class={styles.td}>
                    <code>{status.syncState[0] + status.syncState.slice(1).toLowerCase()}</code>
                  </td>

                  <td class={styles.td}>
                    <code>{status.role[0] + status.role.slice(1).toLowerCase()}</code>
                    <br />
                    For <code>{status.epochsToNextEvent}</code> epochs
                  </td>

                  <td class={styles.td}>
                    <NodePill baseURL={null} nodeNumber={+status.shard} relative />
                  </td>

                  {isAdmin && (
                    <td class={styles.td}>
                      {beacon && beacon > 0 ? "🟢 " : "🔴 "}
                      <code>{beacon}</code>
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
