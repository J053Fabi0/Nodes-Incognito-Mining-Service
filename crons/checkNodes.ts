import {
  lastRoles,
  ErrorInfo,
  errorTypes,
  AllErrorTypes,
  lastErrorTimes,
  globalErrorTypes,
  lastGlobalErrorTimes,
} from "../utils/variables.ts";
import flags from "../utils/flags.ts";
import { escapeHtml } from "escapeHtml";
import { NodeStatus } from "../utils/getNodesStatus.ts";
import isBeingIgnored from "../utils/isBeingIgnored.ts";
import handleNodeError from "../utils/handleNodeError.ts";
import sortNodes, { NodeInfo } from "../utils/sortNodes.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import getShouldBeOnline from "../utils/getShouldBeOnline.ts";
import getMaxNodesOnline from "../utils/getMaxNodesOnline.ts";
import checkGlobalErrors from "../utils/checkGlobalErrors.ts";
import copyPendingBeacons from "../incognito/copyPendingBeacons.ts";
import getMinutesSinceError from "../utils/getMinutesSinceError.ts";
import calculateOnlineQueue from "../utils/calculateOnlineQueue.ts";
import setOrRemoveErrorTime from "../utils/setOrRemoveErrorTime.ts";
import { waitingTimes, minutesToRepeatAlert } from "../constants.ts";
import submitCommand, { commands } from "../telegram/submitCommand.ts";
import handleTextMessage from "../telegram/handlers/handleTextMessage.ts";
import getInstructionsToMoveOrDelete from "../utils/getInstructionsToMoveOrDelete.ts";

export default async function checkNodes() {
  const sortedNodes = await sortNodes(undefined, { fromCacheIfConvenient: true });
  const { nodesInfoByDockerIndex, nodesStatusByDockerIndex } = sortedNodes;
  const nodesStatus = Object.values(nodesStatusByDockerIndex).filter((ns) => ns !== undefined) as NodeStatus[];

  const dockerStatuses: Record<string, NodeInfo | undefined> = flags.ignoreDocker
    ? {}
    : Object.fromEntries(nodesInfoByDockerIndex);

  const fixes: string[] = [];

  // Check for global errors
  const prevLastGlobalErrorTime = { ...lastGlobalErrorTimes };
  await checkGlobalErrors();
  // report errors if they have been present for longer than established
  for (const errorKey of globalErrorTypes)
    await handleErrors(fixes, lastGlobalErrorTimes[errorKey], prevLastGlobalErrorTime[errorKey], errorKey);

  const maxNodesOnline = await getMaxNodesOnline(nodesInfoByDockerIndex);
  calculateOnlineQueue(nodesStatus);

  // Check for errors in each node
  for (const nodeStatus of nodesStatus) {
    if (!(nodeStatus.dockerIndex in lastErrorTimes)) lastErrorTimes[nodeStatus.dockerIndex] = {};
    const { [nodeStatus.dockerIndex]: lastErrorTime } = lastErrorTimes;

    // update the last role of the node
    lastRoles[nodeStatus.dockerIndex] = {
      date: Date.now(),
      role: nodeStatus.role,
      nodeNumber: nodeStatus.number,
      createdAt: +nodeStatus.createdAt,
      client: nodeStatus.client.toString(),
    };

    const shouldBeOnline = getShouldBeOnline(nodeStatus, maxNodesOnline, nodesInfoByDockerIndex);
    const nodeInfo = dockerStatuses[nodeStatus.dockerIndex];
    const dockerInfo = nodeInfo?.docker;
    const isAllOnline = Boolean(dockerInfo?.running && nodeStatus.status === "ONLINE");

    // check if the docker is as it should be, and if not, fix it
    thisIf: if (
      !flags.ignoreDocker &&
      !isBeingIgnored("docker") &&
      dockerInfo &&
      ((dockerInfo.running && !shouldBeOnline) || (!dockerInfo.running && shouldBeOnline))
    ) {
      // if shouldBeOnline, check if it has the shard data
      if (shouldBeOnline && nodeInfo.shard && nodeInfo.shard !== "beacon" && !nodeInfo[nodeInfo.shard])
        break thisIf;

      console.log(
        `${shouldBeOnline ? "Start" : "Stop"}ing docker ${nodeStatus.dockerIndex} ` +
          `for node ${nodeStatus.dockerIndex}.`
      );
      // check in the pending commands if there is a command that is copying from or to the node
      const isCopying =
        commands.pending.findIndex((command) => {
          if (!command.command.startsWith("copy")) return false;

          const fromTo = command.command.split(" ").slice(1, 2);
          return fromTo.includes(nodeStatus.dockerIndex.toString());
        }) !== -1;

      if (!isCopying) await submitCommand(`docker ${shouldBeOnline ? "start" : "stop"} ${nodeStatus.dockerIndex}`);
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
    setOrRemoveErrorTime(nodeStatus.status === "OFFLINE" && shouldBeOnline, lastErrorTime, "offline");
    // unsynced
    setOrRemoveErrorTime(
      // is not latest
      nodeStatus.syncState !== "LATEST" &&
        // should be online
        shouldBeOnline &&
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
    const instructionsToMoveOrDelete = await getInstructionsToMoveOrDelete(sortedNodes);
    if (instructionsToMoveOrDelete.length > 0)
      for (const instruction of instructionsToMoveOrDelete) {
        const command: `${typeof instruction.action}${string}` =
          instruction.action === "delete"
            ? `delete ${instruction.from} ${instruction.shards.join(" ")}`
            : `${instruction.action} ${instruction.from} ${instruction.to} ${instruction.shards.join(" ")}`;

        // if the command is not already in the queue, submit it
        if (commands.pending.findIndex((c) => c.command === command) === -1) await submitCommand(command);
      }

    await copyPendingBeacons();
  }
}

async function handleErrors(
  fixes: string[],
  date: ErrorInfo | undefined,
  lastDate: ErrorInfo | undefined,
  errorKey: AllErrorTypes,
  dockerIndex?: number
) {
  if (date) {
    const minutesSinceError = getMinutesSinceError(date.startedAt);
    const minutesSinceReported = getMinutesSinceError(date.notifiedAt);
    if (
      minutesSinceReported >= minutesToRepeatAlert &&
      // if it has been present for longer than established
      minutesSinceError >= waitingTimes[errorKey] &&
      // and it's not being ignored
      !isBeingIgnored(errorKey)
    ) {
      await handleNodeError(errorKey, dockerIndex, minutesSinceError);
      date.notifiedAt = Date.now();
    }
  }
  // if it had a problem before but it's now fixed, report it even if it's being ignored
  else if (lastDate && getMinutesSinceError(lastDate.startedAt) >= waitingTimes[errorKey])
    fixes.push(
      (dockerIndex ? `<b>${dockerIndex}</b> - ` : "") +
        `<code>${escapeHtml(errorKey)}</code><code>: Fixed ✅</code>`
    );
}
