import { sendHTMLMessage } from "../sendMessage.ts";
import validateNodes from "../../utils/validateNodes.ts";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";
import { docker } from "https://deno.land/x/duplicated_files_cleaner_incognito@1.1.2/mod.ts";

export default async function handleDocker([action, ...rawNodes]: string[]) {
  // check if the command is valid
  if ((action !== "start" && action !== "stop") || rawNodes.length === 0)
    return sendHTMLMessage(
      "Invalid command. Use <code>start</code> or <code>stop</code> followed by the indexes of the nodes or <code>all</code>."
    );

  const nodes =
    rawNodes.length === 1 && rawNodes[0] === "all"
      ? duplicatedFilesCleaner.usedNodes
      : await validateNodes(rawNodes).catch(() => null);
  if (!nodes) return;

  for (const node of nodes) {
    await docker(`inc_mainnet_${node}`, action);
    await sendHTMLMessage(`Docker <code>${node}</code> ${action}ed.`);
  }
}
