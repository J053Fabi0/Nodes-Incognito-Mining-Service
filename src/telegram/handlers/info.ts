import { escapeHtml } from "escapeHtml";
import { sendHTMLMessage } from "../sendMessage.ts";
import { byValues, byNumber, byString } from "sort-es";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import { Info, df } from "duplicatedFilesCleanerIncognito";
import getNodesStatus, { NodeStatus } from "../../utils/getNodesStatus.ts";
import duplicatedFilesCleaner, { duplicatedConstants } from "../../../duplicatedFilesCleaner.ts";

const c = (s: string | number) => `<code>${s}</code>`;

export default async function info(rawNodes: string[]) {
  const onlyFilesystem = rawNodes.length === 1 && rawNodes[0] === "fs";
  if (onlyFilesystem) {
    if (!duplicatedConstants.fileSystem) return await sendHTMLMessage("File system not configured");
    return await sendHTMLMessage(await getFileSistemInfo(duplicatedConstants.fileSystem));
  }

  const nodes = await validateItems({ rawItems: rawNodes }).catch(() => null);
  if (!nodes) return;

  const nodesStatus = (await getNodesStatus()).reduce(
    (obj, node) => ((obj[node.dockerIndex] = node), obj),
    {} as Record<string, NodeStatus>
  );
  const nodesInfo: [string, Info][] = Object.entries(
    await duplicatedFilesCleaner.getInfo(nodes.length ? nodes : undefined)
  ).sort(
    byValues([
      // Sort first by the role. Commitee goes first.
      [([a]) => nodesStatus[a].role, byString()],
      // then by how many epochs to the next event
      [([a]) => nodesStatus[a].epochsToNextEvent, byNumber()],
    ])
  );

  let text = "";

  for (const [node, info] of nodesInfo) {
    const status = nodesStatus[node];
    text +=
      `<code>#${node}  S${status.shard}  ${status.role.charAt(0)}  ->${status.epochsToNextEvent}</code>:\n` +
      `<code>${escapeHtml(objectToTableText(info))
        .replace(/OFFLINE/g, "🔴")
        .replace(/ONLINE/g, "🟢")
        .replace(/: /g, "</code><code>: </code><code>")
        .split("\n")
        .slice(0, -1)
        .join("</code>\n<code>")}</code>` +
      "\n\n";
  }

  if (duplicatedConstants.fileSystem) text += await getFileSistemInfo(duplicatedConstants.fileSystem);

  return await sendHTMLMessage(text.trim());
}

async function getFileSistemInfo(fileSystem: string) {
  return (
    `<b>File system</b>:\n` +
    `<code>${escapeHtml(await df(["-h", fileSystem, "--output=used,avail,pcent"]))}</code>`
  );
}
