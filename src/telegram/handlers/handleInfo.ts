import bot from "../initBot.ts";
import { escapeHtml } from "escapeHtml";
import sortNodes from "../../utils/sortNodes.ts";
import { sendHTMLMessage } from "../sendMessage.ts";
import { df } from "duplicatedFilesCleanerIncognito";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import { duplicatedConstants } from "../../../duplicatedFilesCleaner.ts";
import getInstructionsToMoveOrDelete from "../../utils/getInstructionsToMoveOrDelete.ts";

export default async function handleInfo(
  rawNodes: string[] = [],
  options: Parameters<typeof bot.api.sendMessage>[2] = {}
) {
  const onlyFilesystem = rawNodes.length === 1 && rawNodes[0] === "fs";
  if (onlyFilesystem) {
    if (!duplicatedConstants.fileSystem)
      return await sendHTMLMessage("File system not configured", undefined, options);
    return await sendHTMLMessage(await getFileSistemInfo(duplicatedConstants.fileSystem), undefined, options);
  }

  const nodes = await validateItems({ rawItems: rawNodes }).catch(() => null);
  if (!nodes) return Promise.resolve(null);

  const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } = await sortNodes(nodes);

  let text = "";

  for (const [node, { docker, beacon, ...info }] of nodesInfo) {
    const status = nodesStatus[node];
    // flatten the info object
    const normalizedInfo = {
      ...(docker.status === "ONLINE" ? { uptime: docker.uptime } : {}),
      ...(docker.restarting ? { restarting: true } : {}),
      ...(beacon ? { beacon } : {}),
      ...info,
    };
    text +=
      `<code>#${node}  Sh${status.shard}  ${status.role.charAt(0)}  ` +
      `»${status.epochsToNextEvent.toString().padEnd(4)}` +
      `${docker.status === "ONLINE" ? "🟢" : "🔴"}  ${beacon ? "*" : ""}</code>` +
      (Object.keys(normalizedInfo).length
        ? `\n<code> </code><code>${escapeHtml(objectToTableText(normalizedInfo))
            .split("\n")
            .slice(0, -1)
            .map((a) =>
              a.replace(
                ...(() => {
                  const match = a.match(/: +/);
                  if (match) return [match[0], `</code><code>${match[0]}</code><code>`] as [string, string];
                  else return ["", ""] as [string, string];
                })()
              )
            )
            .join("</code>\n<code> </code><code>")}</code>`
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

  return sendHTMLMessage(text.trim(), undefined, options);
}

async function getFileSistemInfo(fileSystem: string) {
  return (
    `<b>File system</b>:\n` +
    `<code>${escapeHtml(
      (await df(["-h", fileSystem, "--output=used,avail,pcent"]))
        // Remove extra spaces
        .split("\n")
        .map((t) => t.trim())
        .join("\n")
    )}</code>`
  );
}
