import flags from "./utils/flags.ts";
import { waitingTimes } from "../constants.ts";
import { docker, dockerPs } from "./utils/commands.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import handleNodeError from "./utils/handleNodeError.ts";
import getShouldBeOffline from "./utils/getShouldBeOffline.ts";
import getMinutesSinceError from "./utils/getMinutesSinceError.ts";
import { ErrorTypes, LastErrorTime, lastErrorTimes, ignore } from "./utils/variables.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: LastErrorTime, errorKey: ErrorTypes) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || new Date();
  else delete lastErrorTime[errorKey];
}

export default async function check() {
  const nodesStatus = await getNodesStatus();
  const dockerStatuses = flags.ignoreDocker ? {} : await dockerPs();

  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.publicValidatorKey in lastErrorTimes)) lastErrorTimes[nodeStatus.publicValidatorKey] = {};
    const { [nodeStatus.publicValidatorKey]: lastErrorTime } = lastErrorTimes;

    const shouldBeOffline = getShouldBeOffline(nodeStatus);

    // check if the docker is as it should be, and if not, fix it
    if (
      !flags.ignoreDocker &&
      ignore.docker.from.getTime() + ignore.docker.minutes * 60 * 1000 < Date.now() &&
      ((dockerStatuses[nodeStatus.dockerIndex] === "ONLINE" && shouldBeOffline) ||
        (dockerStatuses[nodeStatus.dockerIndex] === "OFFLINE" && !shouldBeOffline))
    ) {
      console.log(
        `${shouldBeOffline ? "Stop" : "Start"}ing docker ${nodeStatus.dockerIndex} for node ${nodeStatus.name}.`
      );
      await docker(`inc_mainnet_${nodeStatus.dockerIndex}`, shouldBeOffline ? "stop" : "start");
    }

    // check for errors
    for (const errorKey of ["alert", "isSlashed", "isOldVersion"] as const)
      setOrRemoveErrorTime(nodeStatus[errorKey], lastErrorTime, errorKey);
    setOrRemoveErrorTime(nodeStatus.syncState.endsWith("STALL"), lastErrorTime, "stalling");
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && !shouldBeOffline, lastErrorTime, "offline");

    // report errors if they have been present for longer than established
    for (const [errorKey, date] of Object.entries(lastErrorTime) as [ErrorTypes, Date][]) {
      const minutes = getMinutesSinceError(date);
      if (
        // if it has been present for longer than established
        minutes >= waitingTimes[errorKey] &&
        // and it's not being ignored
        ignore[errorKey].from.getTime() + ignore[errorKey].minutes * 60 * 1000 <= Date.now()
      )
        await handleNodeError(errorKey, nodeStatus.name, minutes);
    }
  }
}
