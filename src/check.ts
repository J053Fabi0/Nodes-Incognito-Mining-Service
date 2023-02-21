import handleNodeError from "./utils/handleNodeError.ts";
import getMinutesSinceError from "./utils/getMinutesSinceError.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import { ErrorTypes, LastErrorTime, lastErrorTimes } from "./utils/variables.ts";
import { waitingTimes, minEpochsToBeOnline } from "../constants.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: LastErrorTime, errorKey: ErrorTypes) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || new Date();
  else delete lastErrorTime[errorKey];
}

export default async function check() {
  const nodesStatus = await getNodesStatus();
  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.publicValidatorKey in lastErrorTimes)) lastErrorTimes[nodeStatus.publicValidatorKey] = {};
    const { [nodeStatus.publicValidatorKey]: lastErrorTime } = lastErrorTimes;

    const shouldBeOffline = nodeStatus.epochsToNextEvent > minEpochsToBeOnline && nodeStatus.role === "PENDING";

    // check for errors
    for (const errorKey of ["alert", "isSlashed", "isOldVersion"] as const)
      setOrRemoveErrorTime(nodeStatus[errorKey], lastErrorTime, errorKey);
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && !shouldBeOffline, lastErrorTime, "offline");

    // report errors if they have been present for longer than established
    for (const [errorKey, date] of Object.entries(lastErrorTime) as [ErrorTypes, Date][]) {
      const minutes = getMinutesSinceError(date);
      if (minutes >= waitingTimes[errorKey]) await handleNodeError(errorKey, nodeStatus.name, minutes);
    }
  }
}
