import flags from "./utils/flags.ts";
import { escapeHtml } from "escapeHtml";
import { waitingTimes } from "../constants.ts";
import isBeingIgnored from "./utils/isBeingIgnored.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import handleNodeError from "./utils/handleNodeError.ts";
import { sendHTMLMessage } from "./telegram/sendMessage.ts";
import getShouldBeOffline from "./utils/getShouldBeOffline.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { docker, dockerPs } from "duplicatedFilesCleanerIncognito";
import getMinutesSinceError from "./utils/getMinutesSinceError.ts";
import { ErrorTypes, LastErrorTime, lastErrorTimes, errorTypes } from "./utils/variables.ts";
import handleTextMessage from "./telegram/handlers/handleTextMessage.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: LastErrorTime, errorKey: ErrorTypes) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || new Date();
  else delete lastErrorTime[errorKey];
}

export default async function check() {
  const nodesStatus = await getNodesStatus();
  const dockerStatuses = flags.ignoreDocker ? {} : await dockerPs(duplicatedFilesCleaner.usedNodes);
  const fixes: string[] = [];

  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.publicValidatorKey in lastErrorTimes)) lastErrorTimes[nodeStatus.publicValidatorKey] = {};
    const { [nodeStatus.publicValidatorKey]: lastErrorTime } = lastErrorTimes;

    const shouldBeOffline = getShouldBeOffline(nodeStatus);

    // check if the docker is as it should be, and if not, fix it
    if (
      !flags.ignoreDocker &&
      !isBeingIgnored("docker") &&
      ((dockerStatuses[nodeStatus.dockerIndex] === "ONLINE" && shouldBeOffline) ||
        (dockerStatuses[nodeStatus.dockerIndex] === "OFFLINE" && !shouldBeOffline))
    ) {
      console.log(
        `${shouldBeOffline ? "Stop" : "Start"}ing docker ${nodeStatus.dockerIndex} for node ${nodeStatus.name}.`
      );
      await docker(`inc_mainnet_${nodeStatus.dockerIndex}`, shouldBeOffline ? "stop" : "start");
    }

    // save the previous lastErrorTime to check later if it any error was fixed
    const prevLastErrorTime = { ...lastErrorTime };

    // check for errors
    for (const errorKey of ["alert", "isSlashed", "isOldVersion"] as const)
      setOrRemoveErrorTime(nodeStatus[errorKey], lastErrorTime, errorKey);
    setOrRemoveErrorTime(nodeStatus.syncState.endsWith("STALL"), lastErrorTime, "stalling");
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && !shouldBeOffline, lastErrorTime, "offline");

    // report errors if they have been present for longer than established
    for (const errorKey of errorTypes) {
      const date = lastErrorTime[errorKey];
      if (date) {
        const minutes = getMinutesSinceError(date);
        if (
          // if it has been present for longer than established
          minutes >= waitingTimes[errorKey] &&
          // if it's not being ignored
          !isBeingIgnored(errorKey)
        ) {
          await handleNodeError(errorKey, nodeStatus.name, minutes);
        }
      }
      // if it had a problem before but now it's fixed, report it even if it's being ignored
      else if (prevLastErrorTime[errorKey])
        fixes.push(`<b>${nodeStatus.name}</b> - <code>${escapeHtml(errorKey)}</code><code>: Fixed ✅</code>`);
    }
  }

  if (fixes.length) {
    await sendHTMLMessage(fixes.join("\n"));
    await handleTextMessage("text");
  }
}
