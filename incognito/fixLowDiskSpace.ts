import { byNumber, byValues } from "sort-es";
import sortNodes from "../utils/sortNodes.ts";
import { NodeRoles } from "../utils/getNodesStatus.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { lastGlobalErrorTimes } from "../utils/variables.ts";
import checkGlobalErrors from "../utils/checkGlobalErrors.ts";
import { nodesInfoByDockerIndexTest } from "../utils/testingConstants.ts";

const rolesOrder: NodeRoles[] = ["PENDING", "SYNCING", "COMMITTEE"];

let hasLogged = false;

export default async function fixLowDiskSpace() {
  if (!lastGlobalErrorTimes.lowDiskSpace) return;

  const { nodesStatusByDockerIndex, nodesInfoByDockerIndex } = await sortNodes(undefined, {
    fromCacheIfConvenient: true,
  });
  const nodesInfo = Object.fromEntries(nodesInfoByDockerIndex);

  const pendingNodes = nodesInfoByDockerIndexTest
    .filter(([dockerIndex]) => {
      const node = nodesStatusByDockerIndex[dockerIndex];
      return (
        node && node.status === "ONLINE" && rolesOrder.includes(node.role) && nodesInfo[node.dockerIndex].beacon
      );
    })
    // sort them by the online time. The first one will be the oldest
    .sort(
      byValues([
        [([dockerIndex]) => rolesOrder.indexOf(nodesStatusByDockerIndex[dockerIndex]!.role), byNumber()],
        [([, node]) => node.docker.startedAt.valueOf(), byNumber({ desc: true })],
      ])
    );

  if (!hasLogged) console.log((hasLogged = true), pendingNodes);

  if (pendingNodes.length <= 1) return;

  const submittedCommands: string[] = [];
  const firstNode = pendingNodes.shift()![0];

  for (const [dockerIndex] of pendingNodes) {
    const command = `copy ${firstNode} ${dockerIndex} beacon`;
    console.log(command);
    // await submitCommand(command);
    submittedCommands.push(command);

    // check if the error has been fixed
    await checkGlobalErrors();
    if (!lastGlobalErrorTimes.lowDiskSpace) return;
  }

  await sendHTMLMessage(`Could not fix the low disk issue!\n\n<code>${submittedCommands.join("\n")}</code>`);
}
