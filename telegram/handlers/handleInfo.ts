import bot from "../initBots.ts";
import { escapeHtml } from "escapeHtml";
import sortNodes from "../../utils/sortNodes.ts";
import { sendHTMLMessage } from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import { df } from "duplicatedFilesCleanerIncognito";
import { CommandResponse } from "../submitCommand.ts";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import { duplicatedConstants } from "../../duplicatedFilesCleaner.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import getInstructionsToMoveOrDelete from "../../utils/getInstructionsToMoveOrDelete.ts";

/**
 * @param rawNodes Leave empty to get info about all nodes
 */
export default async function handleInfo(
  rawNodes: string[] = [],
  options: Parameters<typeof bot.api.sendMessage>[2] = {}
): Promise<CommandResponse> {
  const onlyFilesystem = rawNodes.length === 1 && rawNodes[0] === "fs";
  if (onlyFilesystem) {
    if (!duplicatedConstants.fileSystem) {
      await sendHTMLMessage("File system not configured", undefined, options);
      return { successful: false, error: "File system not configured" };
    }
    const response = await getFileSistemInfo(duplicatedConstants.fileSystem);
    await sendHTMLMessage(response, undefined, options);
    return { successful: true, response };
  }

  const nodes = await validateItems({ rawItems: rawNodes }).catch((e) => {
    if (isError(e)) return e;
    throw e;
  });
  if (isError(nodes)) return { successful: false, error: nodes.message };

  const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } = await sortNodes(nodes);

  let text = "";

  for (const [node, { docker, beacon, shard: _, ...info }] of nodesInfo) {
    const status = nodesStatus[node];
    // flatten the info object
    const normalizedInfo = {
      ...(docker.running
        ? { uptime: rangeMsToTimeDescription(docker.startedAt, undefined, { short: true }) }
        : { stoped: rangeMsToTimeDescription(docker.finishedAt, undefined, { short: true }) }),
      ...(docker.restarting ? { restarting: true } : {}),
      ...(beacon ? { beacon } : {}),
      ...info,
    };
    text +=
      `<code>#${node}  Sh${status.shard || " "}  ${status.role.charAt(0)}  ` +
      `»${status.epochsToNextEvent.toString().padEnd(4)}` +
      `${docker.running ? "🟢" : "🔴"}  ${beacon ? "*" : ""}</code>` +
      (Object.keys(normalizedInfo).length
        ? `\n<code> ${escapeHtml(objectToTableText(normalizedInfo))
            .split("\n")
            .slice(0, -1)
            .join("</code>\n<code> ")}</code>`
        : "") +
      "\n\n";
  }

  // Add file system info
  if (duplicatedConstants.fileSystem) text += (await getFileSistemInfo(duplicatedConstants.fileSystem)) + "\n";

  // Add possible instructions
  const instructions = await getInstructionsToMoveOrDelete();
  if (instructions.length)
    text += `<b>Instructions</b>:\n<code>${instructions
      .map(({ action, from, to, shards }) => `${action} ${from} ${to ? `${to} ` : ""}${shards.join(" ")}`)
      .join("\n")}</code>`;

  await sendHTMLMessage(text.trim(), undefined, options);
  return { successful: true, response: text.trim() };
}

const getFileSistemInfo = async (fileSystem: string) =>
  `<b>File system</b>:\n` +
  `<code>${escapeHtml(
    (await df(["-h", fileSystem, "--output=used,avail,pcent"]))
      // Remove extra spaces
      .split("\n")
      .map((t) => t.trim())
      .join("\n")
  )}</code>`;
