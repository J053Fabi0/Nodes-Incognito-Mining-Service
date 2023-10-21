import { IS_PRODUCTION } from "../env.ts";
import { byNumber, byValues } from "sort-es";
import { cronsStarted } from "../crons/crons.ts";
import isError from "../types/guards/isError.ts";
import getShouldBeOnline from "./getShouldBeOnline.ts";
import { getNode } from "../controllers/node.controller.ts";
import { Info } from "../duplicatedFilesCleaner/src/getInfo.ts";
import getNodesStatus, { NodeStatus } from "./getNodesStatus.ts";
import duplicatedFilesCleaner from "../controller/duplicatedFilesCleaner.ts";
import { MonitorInfo, lastRoles, monitorInfoByDockerIndex } from "./variables.ts";
import { normalizeShard } from "../duplicatedFilesCleaner/utils/normalizeShards.ts";
import createDocker from "../controller/controllers/createNode/docker/createDocker.ts";
import { ShardsNames, ShardsStr } from "../duplicatedFilesCleaner/types/shards.type.ts";
import { nodesInfoByDockerIndexTest, nodesStatusByDockerIndexTest } from "./testingConstants.ts";
import { dockersBeingDeleted, removeNodeFromConfigs } from "../incognito/deleteDockerAndConfigs.ts";

export const rolesOrder: ((nodeStatus: NodeStatus) => boolean)[] = [
  ({ role }) => role === "COMMITTEE",

  (ns) => ns.role === "PENDING" && getShouldBeOnline(ns),
  (ns) => ns.role === "SYNCING" && getShouldBeOnline(ns),

  (ns) => ns.role === "PENDING" && !getShouldBeOnline(ns),
  (ns) => ns.role === "SYNCING" && !getShouldBeOnline(ns),

  ({ role }) => role === "WAITING",

  // NOT_STAKED is the last on because it's not important that it has files, only that
  // it's online to be able to add it to the app
  ({ role }) => role === "NOT_STAKED",

  // this will trigger if the role is not one of the above
  () => true,
];

export type NodeInfo = Info & { shard: ShardsNames | "" };
export type NodeInfoByDockerIndex = [string, NodeInfo];
export type NodesStatusByDockerIndex = Record<string, NodeStatus | undefined>;
export type SortedNodes = {
  /** dockerIndex as key */
  nodesStatusByDockerIndex: NodesStatusByDockerIndex;
  /** An array of sorted nodes. Each element is [dockerIndex, Info] */
  nodesInfoByDockerIndex: NodeInfoByDockerIndex[];
};

export type SortNodesOptions = {
  /** If true, returns the block height for each shard */
  fullData?: boolean;
  /** If true, returns the data from the cache if it's convenient */
  fromCacheIfConvenient?: boolean;
};

/**
 * @param nodes The docker indexes of the nodes to sort. If undefined, all nodes will be sorted. If empty, no nodes will be sorted.
 * @param fullData If true, returns the block height for each shard
 */
export default async function sortNodes(
  nodes: (string | number)[] = duplicatedFilesCleaner.dockerIndexes,
  { fullData, fromCacheIfConvenient }: SortNodesOptions = {}
): Promise<SortedNodes> {
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
          if (!nodeStatus) return rolesOrder.length - 1;

          const roleIndex = rolesOrder.findIndex((fn) => fn(nodeStatus));

          return roleIndex;
        },
        byNumber(),
      ],
      [
        ([dockerIndex]) => {
          const nodeStatus = nodesStatusByDockerIndex[dockerIndex];
          if (!nodeStatus) return rolesOrder.length - 1;

          // then by how many epochs to the next event if it's committee or pending
          if (nodeStatus.role === "COMMITTEE" || nodeStatus.role === "PENDING")
            return nodeStatus.epochsToNextEvent ?? 0;

          // else by the time it has been in the current role
          return lastRoles[dockerIndex].date;
        },
        byNumber(),
      ],
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

    if (!cronsStarted) console.time("getInfo");
    const nodesInfo = await (async () => {
      while (true) {
        try {
          return await duplicatedFilesCleaner.getInfo(nodesToFetch);
        } catch (e) {
          if (isError(e) && e.message.includes("No such object: inc_mainnet_")) {
            // get the docker index from the error message with a regex
            const dockerIndex = e.message.match(/inc_mainnet_(\d+)/)?.[1];
            if (dockerIndex && !isNaN(+dockerIndex)) {
              console.error(new Error(`Docker ${dockerIndex} not found.`));
              const node = await getNode({ dockerIndex: +dockerIndex });
              if (!node) {
                console.error(new Error(`Node ${dockerIndex} not found in the database.`));
                nodesToFetch.splice(nodesToFetch.indexOf(+dockerIndex), 1);
                removeNodeFromConfigs(+dockerIndex);
              }
              // if it is not being deleted, create it again
              else if (!dockersBeingDeleted[dockerIndex] && !node.inactive) {
                console.log(`Creating docker ${dockerIndex} again.`);
                await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex);
              }
              // at last remove it from the configs
              else removeNodeFromConfigs(parseInt(dockerIndex));
            } else throw e;
          } else throw e;
        }
      }
    })();
    if (!cronsStarted) console.timeEnd("getInfo");

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
