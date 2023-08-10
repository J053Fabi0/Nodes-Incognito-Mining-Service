import sortNodes, { NodeInfoByDockerIndex } from "./sortNodes.ts";

export default async function getMaxNodesOnline(
  nodesInfoByDockerIndex: NodeInfoByDockerIndex[] | Promise<NodeInfoByDockerIndex[]> = sortNodes(undefined, {
    fromCacheIfConvenient: true,
  }).then((a) => a.nodesInfoByDockerIndex)
): Promise<number> {
  // if nodesInfo is a promise, wait for it to resolve
  if (nodesInfoByDockerIndex instanceof Promise) nodesInfoByDockerIndex = await nodesInfoByDockerIndex;

  return nodesInfoByDockerIndex.reduce((n, [, info]) => n + +Boolean(info.beacon), 0);
}
