import moment from "moment";
import { byNumber, byValues } from "sort-es";
import sortNodes from "../utils/sortNodes.ts";
import { NodeRoles } from "../utils/getNodesStatus.ts";
import submitCommand from "../telegram/submitCommand.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { lastGlobalErrorTimes } from "../utils/variables.ts";
import checkGlobalErrors from "../utils/checkGlobalErrors.ts";
import { minutesBetweenFixLowDiskSpace } from "../constants.ts";

const rolesOrder: NodeRoles[] = ["PENDING", "SYNCING", "COMMITTEE"];

let lastAttempt = 0;

/** @param maxNodesToCopy The max number of nodes to copy, including the from node. Default: Infinity */
export default async function fixLowDiskSpace(
  doCheckGlobalErrors: boolean,
  maxNodesToCopy = Infinity
): Promise<void> {
  if (doCheckGlobalErrors && !lastGlobalErrorTimes.lowDiskSpace) return;

  const minutesSinceLastAttempt = moment().diff(lastAttempt, "minutes");
  if (minutesSinceLastAttempt < minutesBetweenFixLowDiskSpace) return;
  lastAttempt = Date.now();

  const { nodesStatusByDockerIndex, nodesInfoByDockerIndex } = await sortNodes(undefined, {
    fromCacheIfConvenient: true,
  });
  const nodesInfo = Object.fromEntries(nodesInfoByDockerIndex);

  const onlineNodes = nodesInfoByDockerIndex
    .filter(([dockerIndex]) => {
      const node = nodesStatusByDockerIndex[dockerIndex];
      return node && node.status === "ONLINE" && rolesOrder.includes(node.role) && nodesInfo[dockerIndex].beacon;
    })
    // sort them by the online time. The first one will be the oldest
    .sort(
      byValues([
        [([dockerIndex]) => rolesOrder.indexOf(nodesStatusByDockerIndex[dockerIndex]!.role), byNumber()],
        [([, node]) => node.docker.startedAt.valueOf(), byNumber({ desc: false })],
      ])
    );

  if (onlineNodes.length <= 1) {
    if (doCheckGlobalErrors) await sendHTMLMessage(`Could not fix the low disk issue! No online nodes.`);
    return;
  }

  const submittedCommands: string[] = [];
  const firstNode = onlineNodes.shift()![0];

  for (const [dockerIndex] of onlineNodes.slice(0, maxNodesToCopy - 1)) {
    const command = `copy ${firstNode} ${dockerIndex} beacon`;
    await submitCommand(command);
    submittedCommands.push(command);

    // check if the error has been fixed
    if (doCheckGlobalErrors) {
      await checkGlobalErrors();
      if (!lastGlobalErrorTimes.lowDiskSpace) return;
    }
  }

  if (doCheckGlobalErrors)
    await sendHTMLMessage(`Could not fix the low disk issue!\n\n<code>${submittedCommands.join("\n")}</code>`);
}
