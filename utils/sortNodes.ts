import { byNumber, byValues } from "sort-es";
import getNodesStatus, { NodeRoles, NodeStatus } from "./getNodesStatus.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { Info, ShardsNames, normalizeShard } from "duplicatedFilesCleanerIncognito";

export const rolesOrder: (NodeRoles | NodeRoles[])[] = [
  "NOT_STAKED",
  // SYNCING is important because it must be online to move to PENDING
  // But committe will get the priority if they have less epochs to the next event
  ["COMMITTEE", "SYNCING"],
  "PENDING",
  "WAITING",
];

export default async function sortNodes(nodes: (string | number)[] = []) {
  const nodesStatusByDockerIndex = (await getNodesStatus()).reduce(
    (obj, node) => ((obj[node.dockerIndex] = node), obj),
    {} as Record<string, NodeStatus>
  );

  const nodesInfoByDockerIndex = Object.entries(
    await duplicatedFilesCleaner.getInfo(nodes.length ? nodes : undefined)
  )
    .map(
      ([dockerIndex, info]) =>
        [
          dockerIndex,
          {
            ...info,
            shard: nodesStatusByDockerIndex[dockerIndex].shard
              ? normalizeShard(nodesStatusByDockerIndex[dockerIndex].shard)
              : "",
          },
        ] as [string, Info & { shard: ShardsNames | "" }]
    )
    .sort(
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
