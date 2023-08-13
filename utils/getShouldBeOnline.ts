import { onlineQueue } from "./variables.ts";
import { NodeInfoByDockerIndex } from "./sortNodes.ts";
import { NodeRoles, NodeStatus } from "./getNodesStatus.ts";
import { maxOnlineNodesNotStaked, minEpochsToBeOnlinePending, minEpochsToBeOnlineSyncing } from "../constants.ts";

type PartialNodeStatus = Partial<NodeStatus> & Pick<NodeStatus, "epochsToNextEvent" | "role" | "dockerIndex">;

const rolesThatUseSortOrder: NodeRoles[] = ["PENDING", "SYNCING"];

export default function getShouldBeOnline(nodeStatus: PartialNodeStatus): boolean;
export default function getShouldBeOnline(
  nodeStatus: PartialNodeStatus,
  maxNodesOnline: number,
  nodesInfoByDockerIndex: NodeInfoByDockerIndex[]
): boolean;
export default function getShouldBeOnline(
  nodeStatus: PartialNodeStatus,
  maxNodesOnline?: number,
  nodesInfoByDockerIndex?: NodeInfoByDockerIndex[]
): boolean {
  // committee nodes are always online
  if (nodeStatus.role === "COMMITTEE") return true;

  const useSortOrder = maxNodesOnline !== undefined && nodesInfoByDockerIndex !== undefined;

  if (useSortOrder && rolesThatUseSortOrder.includes(nodeStatus.role)) {
    const index = nodesInfoByDockerIndex.findIndex(([index]) => +index === nodeStatus.dockerIndex);
    if (index === -1) return false;
    return index + 1 <= maxNodesOnline;
  }
  //
  else return switchMethod(nodeStatus);
}

function switchMethod(nodeStatus: PartialNodeStatus) {
  switch (nodeStatus.role) {
    case "PENDING":
      return nodeStatus.epochsToNextEvent <= minEpochsToBeOnlinePending;

    case "SYNCING":
      return nodeStatus.epochsToNextEvent <= minEpochsToBeOnlineSyncing;

    case "NOT_STAKED": {
      const index = onlineQueue.NOT_STAKED.findIndex((ns) => ns.dockerIndex === nodeStatus.dockerIndex);
      if (index === -1) return false;
      return index + 1 <= maxOnlineNodesNotStaked;
    }

    default:
      return false;
  }
}
