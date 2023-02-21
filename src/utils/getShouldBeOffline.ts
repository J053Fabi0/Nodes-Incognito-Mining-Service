import { NodeStatus } from "./getNodesStatus.ts";
import { minEpochsToBeOnline } from "../../constants.ts";

const getShouldBeOffline = (nodeStatus: Partial<NodeStatus> & Pick<NodeStatus, "epochsToNextEvent" | "role">) =>
  nodeStatus.epochsToNextEvent > minEpochsToBeOnline && nodeStatus.role === "PENDING";
export default getShouldBeOffline;
