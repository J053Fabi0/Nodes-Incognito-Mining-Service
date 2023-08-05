import {
  lastRoles,
  errorTypes,
  AllErrorTypes,
  lastErrorTimes,
  globalErrorTypes,
  lastGlobalErrorTimes,
} from "../utils/variables.ts";
import flags from "../utils/flags.ts";
import { escapeHtml } from "escapeHtml";
import getNodesStatus from "../utils/getNodesStatus.ts";
import isBeingIgnored from "../utils/isBeingIgnored.ts";
import submitCommand from "../telegram/submitCommand.ts";
import handleNodeError from "../utils/handleNodeError.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import getShouldBeOffline from "../utils/getShouldBeOffline.ts";
import getMinutesSinceError from "../utils/getMinutesSinceError.ts";
import { waitingTimes, maxDiskPercentageUsage } from "../constants.ts";
import { df, docker, dockerPs } from "duplicatedFilesCleanerIncognito";
import handleTextMessage from "../telegram/handlers/handleTextMessage.ts";
import getInstructionsToMoveOrDelete from "../utils/getInstructionsToMoveOrDelete.ts";
import duplicatedFilesCleaner, { duplicatedConstants } from "../duplicatedFilesCleaner.ts";

function setOrRemoveErrorTime(set: boolean, lastErrorTime: Record<string, number | undefined>, errorKey: string) {
  if (set) lastErrorTime[errorKey] = lastErrorTime[errorKey] || Date.now();
  else delete lastErrorTime[errorKey];
}

export default async function checkNodes() {
  const nodesStatus = await getNodesStatus();
  const dockerStatuses = flags.ignoreDocker ? {} : await dockerPs(duplicatedFilesCleaner.dockerIndexes);
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
    if (!(nodeStatus.validatorPublic in lastErrorTimes)) lastErrorTimes[nodeStatus.validatorPublic] = {};
    const { [nodeStatus.validatorPublic]: lastErrorTime } = lastErrorTimes;

    // update the last role of the node
    lastRoles[nodeStatus.dockerIndex] = {
      date: Date.now(),
      role: nodeStatus.role,
      nodeNumber: nodeStatus.number,
      createdAt: +nodeStatus.createdAt,
      client: nodeStatus.client.toString(),
    };

    const shouldBeOffline = getShouldBeOffline(nodeStatus);
    const dockerInfo = dockerStatuses[nodeStatus.dockerIndex];
    const isAllOnline = dockerInfo.running && nodeStatus.status === "ONLINE";

    // check if the docker is as it should be, and if not, fix it
    if (
      !flags.ignoreDocker &&
      !isBeingIgnored("docker") &&
      ((dockerInfo.running && shouldBeOffline) || (!dockerInfo.running && !shouldBeOffline))
    ) {
      console.log(
        `${shouldBeOffline ? "Stop" : "Start"}ing docker ${nodeStatus.dockerIndex} ` +
          `for node ${nodeStatus.dockerIndex}.`
      );
      await docker(`inc_mainnet_${nodeStatus.dockerIndex}`, shouldBeOffline ? "stop" : "start");
    }

    // save the previous lastErrorTime to check later if it any error was fixed
    const prevLastErrorTime = { ...lastErrorTime };

    // check for errors
    // isOldVersion
    for (const errorKey of ["isOldVersion"] as const)
      setOrRemoveErrorTime(nodeStatus[errorKey], lastErrorTime, errorKey);
    // alert and isSlashed only when online and in committee
    for (const errorKey of ["isSlashed", "alert"] as const)
      setOrRemoveErrorTime(
        nodeStatus[errorKey] && isAllOnline && nodeStatus.role === "COMMITTEE",
        lastErrorTime,
        errorKey
      );
    // stalling
    setOrRemoveErrorTime(isAllOnline && nodeStatus.syncState.endsWith("STALL"), lastErrorTime, "stalling");
    // offline
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && !shouldBeOffline, lastErrorTime, "offline");
    // unsynced
    setOrRemoveErrorTime(
      // is not latest
      nodeStatus.syncState !== "LATEST" &&
        // should be online
        !shouldBeOffline &&
        // its role is different than NOT_STAKED
        nodeStatus.role !== "NOT_STAKED" &&
        // and it's online, so don't report it if it's offline
        isAllOnline,
      lastErrorTime,
      "unsynced"
    );

    // report errors if they have been present for longer than established
    for (const errorKey of errorTypes)
      await handleErrors(
        fixes,
        lastErrorTime[errorKey],
        prevLastErrorTime[errorKey],
        errorKey,
        nodeStatus.dockerIndex
      );
  }

  if (fixes.length) {
    await sendHTMLMessage(fixes.join("\n"));
    await handleTextMessage("text");
  }

  // Check if there are shards that need to be moved or deleted
  if (!isBeingIgnored("autoMove") && !flags.ignoreDocker) {
    const instructionsToMoveOrDelete = await getInstructionsToMoveOrDelete();
    if (instructionsToMoveOrDelete.length > 0) {
      for (const instruction of instructionsToMoveOrDelete) {
        const nodeTo = nodesStatus.find((node) => `${node.dockerIndex}` === instruction.to);
        const nodeFrom = nodesStatus.find((node) => `${node.dockerIndex}` === instruction.from);
        const isToRunning = nodeTo ? dockerStatuses[nodeTo.dockerIndex].running : true;
        const isFromRunning = nodeFrom ? dockerStatuses[nodeFrom.dockerIndex].running : true;

        if (instruction.action === "move") {
          if (!isToRunning && !isFromRunning)
            submitCommand(`move ${instruction.from} ${instruction.to} ${instruction.shards.join(" ")}`);
        } else if (!isToRunning) submitCommand(`delete ${instruction.from} ${instruction.shards.join(" ")}`);
      }
    }
  }
}

async function handleErrors(
  fixes: string[],
  date: number | undefined,
  lastDate: number | undefined,
  errorKey: AllErrorTypes,
  dockerIndex?: number
) {
  if (date) {
    const minutes = getMinutesSinceError(date);
    if (
      // if it has been present for longer than established
      minutes >= waitingTimes[errorKey] &&
      // and it's not being ignored
      !isBeingIgnored(errorKey)
    )
      await handleNodeError(errorKey, dockerIndex, minutes);
  }
  // if it had a problem before but it's now fixed, report it even if it's being ignored
  else if (lastDate && getMinutesSinceError(lastDate) >= waitingTimes[errorKey])
    fixes.push(
      (dockerIndex ? `<b>${dockerIndex}</b> - ` : "") +
        `<code>${escapeHtml(errorKey)}</code><code>: Fixed ✅</code>`
    );
}
