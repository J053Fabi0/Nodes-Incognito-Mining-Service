import {
  errorTypes,
  AllErrorTypes,
  lastErrorTimes,
  globalErrorTypes,
  lastGlobalErrorTimes,
} from "./utils/variables.ts";
import flags from "./utils/flags.ts";
import { escapeHtml } from "escapeHtml";
import isBeingIgnored from "./utils/isBeingIgnored.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import handleNodeError from "./utils/handleNodeError.ts";
import { sendHTMLMessage } from "./telegram/sendMessage.ts";
import getShouldBeOffline from "./utils/getShouldBeOffline.ts";
import getMinutesSinceError from "./utils/getMinutesSinceError.ts";
import { waitingTimes, maxDiskPercentageUsage } from "../constants.ts";
import { df, docker, dockerPs } from "duplicatedFilesCleanerIncognito";
import handleTextMessage from "./telegram/handlers/handleTextMessage.ts";
import duplicatedFilesCleaner, { duplicatedConstants } from "../duplicatedFilesCleaner.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: Record<string, Date | undefined>, errorKey: string) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || new Date();
  else delete lastErrorTime[errorKey];
}

export default async function check() {
  const nodesStatus = await getNodesStatus();
  const dockerStatuses = flags.ignoreDocker ? {} : await dockerPs(duplicatedFilesCleaner.usedNodes);
  const fixes: string[] = [];

  // Check for global errors
  {
    const prevLastGlobalErrorTime = { ...lastGlobalErrorTimes };
    // Check if the file system is at or above the maximum acceptable percentage
    if (duplicatedConstants.fileSystem) {
      const percentage = +(
        (await df(["-h", duplicatedConstants.fileSystem, "--output=pcent"])).match(/\d+(?=%)/)?.[0] ?? 0
      );
      setOrRemoveErrorTime(percentage >= maxDiskPercentageUsage, lastGlobalErrorTimes, "lowDiskSpace");
    }
    // report errors if they have been present for longer than established
    for (const errorKey of globalErrorTypes)
      await handleErrors(fixes, lastGlobalErrorTimes[errorKey], prevLastGlobalErrorTime[errorKey], errorKey);
  }

  // Check for errors in each node
  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.publicValidatorKey in lastErrorTimes)) lastErrorTimes[nodeStatus.publicValidatorKey] = {};
    const { [nodeStatus.publicValidatorKey]: lastErrorTime } = lastErrorTimes;

    const shouldBeOffline = getShouldBeOffline(nodeStatus);

    // check if the docker is as it should be, and if not, fix it
    if (
      !flags.ignoreDocker &&
      !isBeingIgnored("docker") &&
      ((dockerStatuses[nodeStatus.dockerIndex].status === "ONLINE" && shouldBeOffline) ||
        (dockerStatuses[nodeStatus.dockerIndex].status === "OFFLINE" && !shouldBeOffline))
    ) {
      console.log(
        `${shouldBeOffline ? "Stop" : "Start"}ing docker ${nodeStatus.dockerIndex} for node ${nodeStatus.name}.`
      );
      await docker(`inc_mainnet_${nodeStatus.dockerIndex}`, shouldBeOffline ? "stop" : "start");
    }

    // save the previous lastErrorTime to check later if it any error was fixed
    const prevLastErrorTime = { ...lastErrorTime };

    // check for errors
    // alert, isSlashed, isOldVersion
    for (const errorKey of ["alert", "isSlashed", "isOldVersion"] as const)
      setOrRemoveErrorTime(nodeStatus[errorKey], lastErrorTime, errorKey);
    // stalling
    setOrRemoveErrorTime(nodeStatus.syncState.endsWith("STALL"), lastErrorTime, "stalling");
    // offline
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && !shouldBeOffline, lastErrorTime, "offline");
    // unsynced
    setOrRemoveErrorTime(
      // is not latest
      nodeStatus.syncState !== "LATEST" &&
        // should be online
        !shouldBeOffline &&
        // and it's online, so don't report it if it's offline
        nodeStatus.status === "ONLINE",
      lastErrorTime,
      "unsynced"
    );

    // report errors if they have been present for longer than established
    for (const errorKey of errorTypes)
      await handleErrors(fixes, lastErrorTime[errorKey], prevLastErrorTime[errorKey], errorKey, nodeStatus.name);
  }

  if (fixes.length) {
    await sendHTMLMessage(fixes.join("\n"));
    await handleTextMessage("text");
  }
}

async function handleErrors(
  fixes: string[],
  date: Date | undefined,
  lastDate: Date | undefined,
  errorKey: AllErrorTypes,
  nodeName?: string
) {
  if (date) {
    const minutes = getMinutesSinceError(date);
    if (
      // if it has been present for longer than established
      minutes >= waitingTimes[errorKey] &&
      // and it's not being ignored
      !isBeingIgnored(errorKey)
    )
      await handleNodeError(errorKey, nodeName, minutes);
  }
  // if it had a problem before but it's now fixed, report it even if it's being ignored
  else if (lastDate && getMinutesSinceError(lastDate) >= waitingTimes[errorKey])
    fixes.push(
      (nodeName ? `<b>${nodeName}</b> - ` : "") + `<code>${escapeHtml(errorKey)}</code><code>: Fixed ✅</code>`
    );
}
