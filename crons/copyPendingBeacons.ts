import sortNodes from "../utils/sortNodes.ts";
import { NodeStatus } from "../utils/getNodesStatus.ts";
import submitCommand from "../telegram/submitCommand.ts";

export default async function copyPendingBeacons() {
  const { nodesStatusByDockerIndex, nodesInfoByDockerIndex } = await sortNodes(undefined, {
    fromCacheIfConvenient: true,
  });
  const nodesInfo = Object.fromEntries(nodesInfoByDockerIndex);

  const pendingNodes = Object.values(nodesStatusByDockerIndex).filter(
    (node) => (node?.role === "PENDING" || node?.role === "SYNCING") && nodesInfo[node.dockerIndex].beacon
  ) as NodeStatus[];

  if (pendingNodes.length <= 1) return;

  const firstNode = pendingNodes.shift()!.dockerIndex;
  for (const { dockerIndex } of pendingNodes.slice(0, 10))
    submitCommand(`copy ${firstNode} ${dockerIndex} beacon`);
}
