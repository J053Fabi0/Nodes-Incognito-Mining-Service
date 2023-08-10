import { IS_PRODUCTION } from "../env.ts";
import { byNumber, byValues } from "sort-es";
import { getShouldBeOnline } from "./getShouldBeOffline.ts";
import getNodesStatus, { NodeStatus } from "./getNodesStatus.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { MonitorInfo, monitorInfoByDockerIndex } from "./variables.ts";
import { Info, ShardsNames, normalizeShard, ShardsStr } from "duplicatedFilesCleanerIncognito";
import { nodesInfoByDockerIndexTest, nodesStatusByDockerIndexTest } from "./testingConstants.ts";

export const rolesOrder: ((nodeStatus: NodeStatus) => boolean)[] = [
  ({ role }) => role === "COMMITTEE",

  (ns) => ns.role === "PENDING" && getShouldBeOnline(ns),

  ({ role, epochsToNextEvent }) => epochsToNextEvent <= 3 && role === "SYNCING",

  (ns) => ns.role === "PENDING" && !getShouldBeOnline(ns),

  ({ role, epochsToNextEvent }) => epochsToNextEvent > 3 && role === "SYNCING",

  ({ role }) => role === "WAITING",

  // NOT_STAKED is the last because it's not important that it has files, only that
  // it's online to be able to stake
  ({ role }) => role === "NOT_STAKED",
];

export type NodeInfoByDockerIndex = [string, Info & { shard: ShardsNames | "" }];
export type NodesStatusByDockerIndex = Record<string, NodeStatus | undefined>;

/**
 * @param nodes The docker indexes of the nodes to sort. If undefined, all nodes will be sorted. If empty, no nodes will be sorted.
 * @param fullData If true, returns the block height for each shard
 */
export default async function sortNodes(
  nodes: (string | number)[] = duplicatedFilesCleaner.dockerIndexes,
  { fullData, fromCacheIfConvenient }: { fullData?: boolean; fromCacheIfConvenient?: boolean } = {}
) {
  if (nodes.length === 0) return { nodesStatusByDockerIndex: {}, nodesInfoByDockerIndex: [] };

  const nodesToFetch = fromCacheIfConvenient ? [] : nodes;
  const nodesFromCache: typeof nodes = [];

  // if wanting to get from cache, separate those who are in the cache from those who are not
  if (fromCacheIfConvenient)
    for (const dockerIndex of nodes) {
      const cacheInfo = monitorInfoByDockerIndex[dockerIndex];
      if (
        !cacheInfo || // fetch those who are not in the cache
        (fullData && cacheInfo.nodeStatus.shardsBlockHeights === null) // and those who don't have the full data if we want it
      ) {
        nodesToFetch.push(dockerIndex);
      } else nodesFromCache.push(dockerIndex);
    }

  const nodesStatusByDockerIndex = await getNodesStatusByDockerIndex(nodesToFetch, nodesFromCache, fullData);
  const nodesInfoByDockerIndex = await getNodesInfoByDockerIndex(
    nodesToFetch,
    nodesFromCache,
    nodesStatusByDockerIndex
  );

  const sortedInfo = nodesInfoByDockerIndex.sort(
    byValues([
      // Sort first by the role by the order defined in sortOrder
      [
        ([dockerIndex]) => {
          const nodeStatus = nodesStatusByDockerIndex[dockerIndex];
          if (!nodeStatus) return rolesOrder.length;

          const roleIndex = rolesOrder.findIndex((fn) => fn(nodeStatus));
          return roleIndex === -1 ? rolesOrder.length : roleIndex;
        },
        byNumber(),
      ],
      // then by how many epochs to the next event
      [([dockerIndex]) => nodesStatusByDockerIndex[dockerIndex]?.epochsToNextEvent ?? 0, byNumber()],
    ])
  );

  // save data in monitorInfoByDockerIndex
  for (const [dockerIndex, nodeInfo] of sortedInfo) {
    const nodeStatus = nodesStatusByDockerIndex[dockerIndex];
    if (!nodeStatus) continue;

    const lastInfo = monitorInfoByDockerIndex[dockerIndex];
    const newInfo: MonitorInfo = {
      nodeInfo,
      nodeStatus,
      date: Date.now(),
    };

    // preserve the full data from the previous request if this one doesn't have it
    const prevShardsBlockHeights = lastInfo?.nodeStatus.shardsBlockHeights;
    const newShardsBlockHeights = newInfo.nodeStatus.shardsBlockHeights;
    if (prevShardsBlockHeights && !newShardsBlockHeights)
      newInfo.nodeStatus.shardsBlockHeights = prevShardsBlockHeights;

    monitorInfoByDockerIndex[dockerIndex] = newInfo;
  }

  return { nodesStatusByDockerIndex, nodesInfoByDockerIndex: sortedInfo };
}

async function getNodesStatusByDockerIndex(
  nodesToFetch: (string | number)[],
  nodesFromCache: (string | number)[],
  fullData?: boolean
): Promise<NodesStatusByDockerIndex> {
  const nodesStatusByDockerIndex = await (async () => {
    if (nodesToFetch.length === 0) return {};

    if (!IS_PRODUCTION)
      return Object.fromEntries(
        Object.entries(nodesStatusByDockerIndexTest).filter(([doIdx]) =>
          nodesToFetch.some((n) => `${n}` === doIdx)
        )
      );

    const nodesStatus = await getNodesStatus({ fullData, dockerIndexes: nodesToFetch });
    return nodesStatus.reduce<Record<string, NodesStatusByDockerIndex[string]>>(
      (obj, node) => ((obj[node.dockerIndex] = node), obj),
      {}
    );
  })();

  // load the missing statuses from the cache
  for (const node of nodesFromCache) nodesStatusByDockerIndex[node] = monitorInfoByDockerIndex[node]?.nodeStatus;

  return nodesStatusByDockerIndex;
}

async function getNodesInfoByDockerIndex(
  nodesToFetch: (string | number)[],
  nodesFromCache: (string | number)[],
  nodesStatusByDockerIndex: NodesStatusByDockerIndex
): Promise<NodeInfoByDockerIndex[]> {
  const nodesInfoByDockerIndex = await (async () => {
    if (nodesToFetch.length === 0) return [];

    if (!IS_PRODUCTION)
      return nodesInfoByDockerIndexTest.filter(([doIdx]) => nodesToFetch.some((n) => `${n}` === doIdx));

    const nodesInfo = await duplicatedFilesCleaner.getInfo(nodesToFetch);
    return Object.entries(nodesInfo).map(
      ([dockerIndex, info]) =>
        [
          dockerIndex,
          {
            ...info,
            shard: nodesStatusByDockerIndex[dockerIndex]?.shard
              ? normalizeShard(nodesStatusByDockerIndex[dockerIndex]!.shard as ShardsStr)
              : "",
          },
        ] satisfies NodeInfoByDockerIndex
    );
  })();

  // load the missing info from the cache
  for (const dockerIndex of nodesFromCache)
    nodesInfoByDockerIndex.push([`${dockerIndex}`, monitorInfoByDockerIndex[dockerIndex]!.nodeInfo]);

  return nodesInfoByDockerIndex;
}
