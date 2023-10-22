import NodePill from "./NodePill.tsx";
import { ComponentChildren } from "preact";
import { lastRoles } from "../../utils/variables.ts";
import { NodeStatus } from "../../utils/getNodesStatus.ts";
import { numberWithCommas, toFixedS } from "../../utils/numbersString.ts";
import { roleToEmoji } from "../../telegram/handlers/handleTextMessage.ts";
import { ShardsStr } from "../../duplicatedFilesCleaner/types/shards.type.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  tr: "even:bg-gray-50",
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

const chooseBackground = (isGreen: boolean | number | string | undefined, isAdmin: boolean) =>
  isAdmin ? (isGreen ? " bg-green-100" : " bg-red-100") : "";

interface MonitorTableProps {
  isAdmin: boolean;
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
}

export default function MonitorTable({ isAdmin, nodesInfo, nodesStatus }: MonitorTableProps) {
  const totalBeacon = isAdmin ? nodesInfo.reduce((n, [, a]) => n + +Boolean(a.beacon), 0) : 0;
  const totalShard = isAdmin
    ? ` ${nodesInfo.reduce((n, [node, a]) => {
        const status = nodesStatus[node];
        if (!status) return n;
        return n + +Boolean(a[`shard${status.shard}`]);
      }, 0)}`
    : "";
  const totalOnlineDockers = isAdmin ? ` ${nodesInfo.reduce((n, [, a]) => n + +a.docker.running, 0)}` : "";
  const totalOnlineNodes = isAdmin
    ? ` ${nodesInfo.reduce((n, [node]) => n + +(nodesStatus[node]?.status === "ONLINE"), 0)}`
    : "";

  return (
    <div class="overflow-x-auto">
      <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
        <thead>
          <tr>
            <th class={styles.th}>Nodes ({nodesInfo.length})</th>
            <th class={styles.th}>Docker{totalOnlineDockers}</th>
            <th class={styles.th}>Online{totalOnlineNodes}</th>
            <th class={styles.th}>Sync</th>
            <th class={styles.th}>Role</th>
            <th class={styles.th}>Shard{totalShard}</th>
            {isAdmin && <th class={styles.th}>Beacon {totalBeacon}</th>}
          </tr>
        </thead>
        <tbody>
          {nodesInfo.map(([node, { docker, beacon, ...shards }]) => {
            const status = nodesStatus[node];
            if (!status) return null;
            const { shardsBlockHeights } = status;
            const shard = shards[`shard${status.shard}`] ?? 0;
            const sync = status.syncState[0] + status.syncState.slice(1).toLowerCase();
            const roleSince = rangeMsToTimeDescription(lastRoles[+node].date, undefined, { short: true });
            return (
              <tr class={styles.tr}>
                {/* Nodes */}
                <td class={styles.td} title={isAdmin ? `${status.client}` : undefined}>
                  <NodePill relative baseURL={null} nodeNumber={isAdmin ? +node : status.number} />
                  {isAdmin && (
                    <>
                      <br />
                      <code>
                        Number: <b>{status.number}</b>
                      </code>
                    </>
                  )}
                </td>

                {/* Docker */}
                <td class={styles.td + chooseBackground(docker.running, isAdmin)}>
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

                {/* Online */}
                <td class={styles.td + chooseBackground(status.status === "ONLINE", isAdmin)}>
                  {status.status === "ONLINE" && (isAdmin ? true : docker.running) ? "🟢" : "🔴"}
                  {isAdmin && (
                    <code title="Vote stat">
                      <br />
                      {status.voteStat === null ? "-" : `${status.voteStat}%`}
                    </code>
                  )}
                </td>

                {/* Sync */}
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

                {/* Role */}
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

                {/* Shard */}
                <td
                  class={styles.td + chooseBackground(shard, isAdmin)}
                  title={isAdmin ? `${numberWithCommas(shard || 0)} files` : undefined}
                >
                  {status.shard === "" ? (
                    "-"
                  ) : (
                    <>
                      <NodePill baseURL={null} nodeNumber={+status.shard} relative />
                      {isAdmin && shardsBlockHeights && (
                        <>
                          {" "}
                          <ShardInfo shardsBlockHeights={shardsBlockHeights} shard={status.shard}>
                            {" "}
                            {shard ? "🟢" : "🔴"}
                          </ShardInfo>
                        </>
                      )}
                    </>
                  )}
                </td>

                {/* Beacon */}
                {isAdmin && (
                  <td class={styles.td + chooseBackground(beacon, isAdmin)} title={`${beacon ?? 0} files`}>
                    {shardsBlockHeights && (
                      <>
                        {beacon ? "🟢" : "🔴"} <ShardInfo shardsBlockHeights={shardsBlockHeights} shard="-1" />
                      </>
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

function ShardInfo({
  shardsBlockHeights,
  shard,
  children,
}: {
  shardsBlockHeights: Exclude<NodeStatus["shardsBlockHeights"], null>;
  shard: ShardsStr | "-1";
  children?: ComponentChildren;
}) {
  return (
    <>
      <code>{toFixedS((shardsBlockHeights[shard].node / shardsBlockHeights[shard].latest) * 100, 2)}</code>%
      {children}
      <br />
      <code>{numberWithCommas(shardsBlockHeights[shard].latest - shardsBlockHeights[shard].node)}</code>
    </>
  );
}
