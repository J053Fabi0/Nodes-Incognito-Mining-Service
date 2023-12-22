import {
  lastRoles,
  ErrorInfo,
  errorTypes,
  ErrorTypes,
  AllErrorTypes,
  lastErrorTimes,
  globalErrorTypes,
  GlobalErrorTypes,
  lastGlobalErrorTimes,
} from "../utils/variables.ts";
import flags from "../utils/flags.ts";
import { escapeHtml } from "escapeHtml";
import { NodeStatus } from "../utils/getNodesStatus.ts";
import isBeingIgnored from "../utils/isBeingIgnored.ts";
import isErrorType from "../types/guards/isErrorType.ts";
import handleNodeError from "../utils/handleNodeError.ts";
import sortNodes, { NodeInfo } from "../utils/sortNodes.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import getShouldBeOnline from "../utils/getShouldBeOnline.ts";
import checkGlobalErrors from "../utils/checkGlobalErrors.ts";
import fixLowDiskSpace from "../incognito/fixLowDiskSpace.ts";
import getMinutesSinceError from "../utils/getMinutesSinceError.ts";
import calculateOnlineQueue from "../utils/calculateOnlineQueue.ts";
import setOrRemoveErrorTime from "../utils/setOrRemoveErrorTime.ts";
import { waitingTimes, minutesToRepeatAlert } from "../constants.ts";
import isGlobalErrorType from "../types/guards/isGlobalErrorType.ts";
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

  calculateOnlineQueue(nodesStatus);

  // Check for errors in each node
  for (const nodeStatus of nodesStatus) {
    const { dockerIndex } = nodeStatus;
    if (!(dockerIndex in lastErrorTimes)) lastErrorTimes[dockerIndex] = {};
    const { [dockerIndex]: lastErrorTime } = lastErrorTimes;

    // update the last role of the node
    lastRoles[dockerIndex] = {
      date: Date.now(),
      role: nodeStatus.role,
      nodeNumber: nodeStatus.number,
      createdAt: +nodeStatus.createdAt,
      client: nodeStatus.client.toString(),
    };

    const shouldBeOnline = getShouldBeOnline(nodeStatus);
    const nodeInfo = dockerStatuses[dockerIndex];
    const dockerInfo = nodeInfo?.docker;
    const isAllOnline = Boolean(dockerInfo?.running && nodeStatus.status === "ONLINE");

    // check if the docker is as it should be, and if not, fix it
    thisIf: if (
      !flags.ignoreDocker &&
      !isBeingIgnored("docker", dockerIndex) &&
      dockerInfo &&
      ((dockerInfo.running && !shouldBeOnline) || (!dockerInfo.running && shouldBeOnline))
    ) {
      // if shouldBeOnline, check if it has the shard and beacon data
      if (
        shouldBeOnline &&
        nodeInfo.shard &&
        nodeInfo.shard !== "beacon" &&
        !nodeInfo[nodeInfo.shard] &&
        !nodeInfo.beacon
      )
        break thisIf;

      console.log(`${shouldBeOnline ? "Start" : "Stop"}ing docker ${dockerIndex} ` + `for node ${dockerIndex}.`);
      // check in the pending commands if there is a command that is copying from or to the node
      const isCopying =
        commands.pending.findIndex((command) => {
          if (!command.command.startsWith("copy")) return false;

          const fromTo = command.command.split(" ").slice(1, 2);
          return fromTo.includes(dockerIndex.toString());
        }) !== -1;

      if (!isCopying) await submitCommand(`docker ${shouldBeOnline ? "start" : "stop"} ${dockerIndex}`);
    }

    // save the previous lastErrorTime to check later if it any error was fixed
    const prevLastErrorTime = { ...lastErrorTime };

    // check for errors
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
      await handleErrors(fixes, lastErrorTime[errorKey], prevLastErrorTime[errorKey], errorKey, dockerIndex);
  }

  if (fixes.length) {
    await sendHTMLMessage(fixes.join("\n"));
    await handleTextMessage("text");
  }

  // Check if there are shards that need to be moved or deleted
  if (!flags.ignoreDocker) {
    const instructionsToMoveOrDelete = await getInstructionsToMoveOrDelete(sortedNodes);
    if (instructionsToMoveOrDelete.length > 0)
      for (const instruction of instructionsToMoveOrDelete) {
        // check neither the from or to are being ignored for autoMove
        if (isBeingIgnored("autoMove", instruction.from)) continue;
        if (instruction.to !== undefined && isBeingIgnored("autoMove", instruction.to)) continue;

        if (instruction.action.includes("delete")) continue; // temporarily disable deleting shards

        const command: `${typeof instruction.action}${string}` =
          instruction.action === "delete"
            ? `delete ${instruction.from} ${instruction.shards.join(" ")}`
            : `${instruction.action} ${instruction.from} ${instruction.to} ${instruction.shards.join(" ")}`;

        // if the command is not already in the queue, submit it
        if (commands.pending.findIndex((c) => c.command === command) === -1) await submitCommand(command);
      }

    await fixLowDiskSpace(true);
  }
}

async function handleErrors(
  fixes: string[],
  date: ErrorInfo | undefined,
  lastDate: ErrorInfo | undefined,
  errorKey: ErrorTypes,
  dockerIndex: number
): Promise<void>;
async function handleErrors(
  fixes: string[],
  date: ErrorInfo | undefined,
  lastDate: ErrorInfo | undefined,
  errorKey: GlobalErrorTypes
): Promise<void>;
async function handleErrors(
  fixes: string[],
  date: ErrorInfo | undefined,
  lastDate: ErrorInfo | undefined,
  errorKey: AllErrorTypes,
  dockerIndex?: number
): Promise<void> {
  if (date) {
    const minutesSinceError = getMinutesSinceError(date.startedAt);
    const minutesSinceReported = getMinutesSinceError(date.notifiedAt);
    if (
      minutesSinceReported >= minutesToRepeatAlert &&
      // if it has been present for longer than established
      minutesSinceError >= waitingTimes[errorKey] &&
      // and it's not being ignored
      ((isGlobalErrorType(errorKey) && !isBeingIgnored(errorKey)) ||
        (dockerIndex !== undefined && isErrorType(errorKey) && !isBeingIgnored(errorKey, dockerIndex)))
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
