import validateItems from "../../utils/validateItems.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";

export default async function handleDocker([action, ...rawNodes]: string[]) {
  // check if the command is valid
  if ((action !== "start" && action !== "stop") || rawNodes.length === 0)
    return sendHTMLMessage(
      "Invalid command. Use <code>start</code> or <code>stop</code> followed by the indexes of the nodes or <code>all</code>."
    );

  const nodes =
    rawNodes.length === 1 && rawNodes[0] === "all"
      ? duplicatedFilesCleaner.usedNodes
      : await validateItems({ rawItems: rawNodes }).catch(() => null);
  if (!nodes) return;

  for (const node of nodes) {
    await docker(`inc_mainnet_${node}`, action);
    await sendHTMLMessage(`Docker <code>${node}</code> ${action === "stop" ? "stopp" : "start"}ed.`);
  }

  await sendMessage("Done.");
}
