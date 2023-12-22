import { onlineQueue } from "./variables.ts";
import { NodeStatus } from "./getNodesStatus.ts";
import { maxOnlineNodesNotStaked, minEpochsToBeOnlinePending, minEpochsToBeOnlineSyncing } from "../constants.ts";

type PartialNodeStatus = Partial<NodeStatus> & Pick<NodeStatus, "epochsToNextEvent" | "role" | "dockerIndex">;

export default function getShouldBeOnline(nodeStatus: PartialNodeStatus): boolean;
export default function getShouldBeOnline(nodeStatus: PartialNodeStatus): boolean {
  // committee nodes are always online
  if (nodeStatus.role === "COMMITTEE") return true;

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
