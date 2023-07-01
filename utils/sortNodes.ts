import { IS_PRODUCTION } from "../env.ts";
import { byNumber, byValues } from "sort-es";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import getNodesStatus, { NodeRoles, NodeStatus } from "./getNodesStatus.ts";
import { Info, ShardsNames, normalizeShard } from "duplicatedFilesCleanerIncognito";
import { nodesInfoByDockerIndexTest, nodesStatusByDockerIndexTest } from "./testingConstants.ts";

export const rolesOrder: (NodeRoles | NodeRoles[])[] = [
  // SYNCING is important because it must be online to move to PENDING
  // But committe will get the priority if they have less epochs to the next event
  ["COMMITTEE", "SYNCING"],
  "PENDING",
  "WAITING",
  // NOT_STAKED is the last because it's not important that it has files, only that
  // it's online to be able to stake
  "NOT_STAKED",
];

export type NodeInfoByDockerIndex = [string, Info & { shard: ShardsNames | "" }];
export type NodesStatusByDockerIndex = Record<string, NodeStatus>;

export default async function sortNodes(nodes: (string | number)[] = []) {
  // nodesStr is only used for development
  const nodesStr = IS_PRODUCTION ? nodes : nodes.map((node) => `${node}`);

  const nodesStatusByDockerIndex: NodesStatusByDockerIndex = IS_PRODUCTION
    ? (await getNodesStatus()).reduce(
        (obj, node) => ((obj[node.dockerIndex] = node), obj),
        {} as Record<string, NodeStatus>
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
                shard: nodesStatusByDockerIndex[dockerIndex].shard
                  ? normalizeShard(nodesStatusByDockerIndex[dockerIndex].shard)
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
          const roleIndex = rolesOrder.findIndex((roles) =>
            Array.isArray(roles)
              ? roles.includes(nodesStatusByDockerIndex[dockerIndex].role)
              : roles === nodesStatusByDockerIndex[dockerIndex].role
          );
          return roleIndex === -1 ? rolesOrder.length : roleIndex;
        },
        byNumber(),
      ],
      // then by how many epochs to the next event
      [([dockerIndex]) => nodesStatusByDockerIndex[dockerIndex].epochsToNextEvent, byNumber()],
    ])
  );

  return { nodesStatusByDockerIndex, nodesInfoByDockerIndex };
}
