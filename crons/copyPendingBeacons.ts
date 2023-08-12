import sortNodes from "../utils/sortNodes.ts";
import { NodeStatus } from "../utils/getNodesStatus.ts";

export default async function copyPendingBeacons() {
  const { nodesStatusByDockerIndex } = await sortNodes(undefined, { fromCacheIfConvenient: true });

  const pendingNodes = Object.values(nodesStatusByDockerIndex).filter(
    (node) => node?.role === "PENDING"
  ) as NodeStatus[];
  if (pendingNodes.length <= 1) return;

  const firstNode = pendingNodes.shift()!.dockerIndex;
  // for (const { dockerIndex } of pendingNodes) submitCommand(`copy ${firstNode} ${dockerIndex} beacon`);
  for (const { dockerIndex } of pendingNodes) console.log(`copy ${firstNode} ${dockerIndex} beacon`);
}
