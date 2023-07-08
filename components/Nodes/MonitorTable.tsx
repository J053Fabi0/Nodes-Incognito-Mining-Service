import NodePill from "./NodePill.tsx";
import { lastRoles } from "../../utils/variables.ts";
import { roleToEmoji } from "../../telegram/handlers/handleTextMessage.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface MonitorTableProps {
  isAdmin: boolean;
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
}

export default function MonitorTable({ isAdmin, nodesInfo, nodesStatus }: MonitorTableProps) {
  return (
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
            const roleSince = rangeMsToTimeDescription(lastRoles[+node].date, undefined, { short: true });
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

                <td class={styles.td} title={roleSince}>
                  <code>
                    {roleToEmoji(status.role)}
                    &nbsp;
                    {status.role[0] + status.role.slice(1).toLowerCase().replace(/_/g, " ")}
                  </code>
                  <br />
                  {isAdmin ? (
                    <>
                      <code>{roleSince}</code> | <code class="font-semibold">{status.epochsToNextEvent}</code>
                    </>
                  ) : (
                    <>
                      For <code class="font-semibold">{status.epochsToNextEvent}</code> epochs
                    </>
                  )}
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
  );
}
