import { IS_PRODUCTION } from "../env.ts";
import { byNumber, byValues } from "sort-es";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import getNodesStatus, { NodeRoles, NodeStatus } from "./getNodesStatus.ts";
import { Info, ShardsNames, normalizeShard, ShardsStr } from "duplicatedFilesCleanerIncognito";
import { nodesInfoByDockerIndexTest, nodesStatusByDockerIndexTest } from "./testingConstants.ts";

export const rolesOrder: (NodeRoles | NodeRoles[])[] = [
  "COMMITTEE",
  "PENDING",
  "WAITING",
  // SYNCING has a conditional priority
  "SYNCING",
  // NOT_STAKED is the last because it's not important that it has files, only that
  // it's online to be able to stake
  "NOT_STAKED",
];

export type NodeInfoByDockerIndex = [string, Info & { shard: ShardsNames | "" }];
export type NodesStatusByDockerIndex = Record<string, NodeStatus | undefined>;

export default async function sortNodes(nodes: (string | number)[] = []) {
  // nodesStr is only used for development
  const nodesStr = IS_PRODUCTION ? nodes : nodes.map((node) => `${node}`);

  const nodesStatusByDockerIndex: NodesStatusByDockerIndex = IS_PRODUCTION
    ? (await getNodesStatus()).reduce<Record<string, NodeStatus>>(
        (obj, node) => ((obj[node.dockerIndex] = node), obj),
        {}
      )
    : nodes.length
    ? Object.fromEntries(
        Object.entries(nodesStatusByDockerIndexTest).filter(([dockerIndex]) => nodesStr.includes(dockerIndex))
      )
    : nodesStatusByDockerIndexTest;

  const nodesInfoByDockerIndex: NodeInfoByDockerIndex[] = (
    IS_PRODUCTION
      ? Object.entries(await duplicatedFilesCleaner.getInfo(nodes.length ? nodes : undefined)).map(
          ([dockerIndex, info]) =>
            [
              dockerIndex,
              {
                ...info,
                shard: nodesStatusByDockerIndex[dockerIndex]?.shard
                  ? normalizeShard(nodesStatusByDockerIndex[dockerIndex]!.shard as ShardsStr)
                  : "",
              },
            ] as NodeInfoByDockerIndex
        )
      : nodes.length
      ? nodesInfoByDockerIndexTest.filter(([dockerIndex]) => nodesStr.includes(dockerIndex))
      : nodesInfoByDockerIndexTest
  ).sort(
    byValues([
      // Sort first by the role by the order defined in sortOrder
      [
        ([dockerIndex]) => {
          const nodeStatus = nodesStatusByDockerIndex[dockerIndex];
          if (!nodeStatus) return rolesOrder.length;

          const role = nodeStatus.role;

          // if the role is "SYNCING", make it the first one if it has less or 3 epochs to the next event
          if (role === "SYNCING" && nodeStatus.epochsToNextEvent <= 3) return 0;

          const roleIndex = rolesOrder.findIndex((roles) =>
            Array.isArray(roles) ? roles.includes(role) : roles === nodeStatus.role
          );
          return roleIndex === -1 ? rolesOrder.length : roleIndex;
        },
        byNumber(),
      ],
      // then by how many epochs to the next event
      [([dockerIndex]) => nodesStatusByDockerIndex[dockerIndex]?.epochsToNextEvent ?? 0, byNumber()],
    ])
  );

  return { nodesStatusByDockerIndex, nodesInfoByDockerIndex };
}
