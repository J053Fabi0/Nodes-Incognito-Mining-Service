import { docker, dockerPs } from "./utils/commands.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import handleNodeError from "./utils/handleNodeError.ts";
import getMinutesSinceError from "./utils/getMinutesSinceError.ts";
import { waitingTimes, minEpochsToBeOnline } from "../constants.ts";
import { ErrorTypes, LastErrorTime, lastErrorTimes } from "./utils/variables.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: LastErrorTime, errorKey: ErrorTypes) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || new Date();
  else delete lastErrorTime[errorKey];
}

export default async function check() {
  const nodesStatus = await getNodesStatus();
  const dockerStatus = await dockerPs();

  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.publicValidatorKey in lastErrorTimes)) lastErrorTimes[nodeStatus.publicValidatorKey] = {};
    const { [nodeStatus.publicValidatorKey]: lastErrorTime } = lastErrorTimes;

    const shouldBeOffline = nodeStatus.epochsToNextEvent > minEpochsToBeOnline && nodeStatus.role === "PENDING";

    // check if the docker is as it should be, and if not, fix it
    if (dockerStatus[nodeStatus.dockerIndex] !== nodeStatus.status) {
      console.log(
        `${shouldBeOffline ? "Stop" : "Start"}ing docker ${nodeStatus.dockerIndex} for node ${nodeStatus.name}.`
      );
      await docker(`inc_mainnet_${nodeStatus.dockerIndex}`, shouldBeOffline ? "stop" : "start");
    }

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
