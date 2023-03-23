import { escapeHtml } from "escapeHtml";
import { sendHTMLMessage } from "../sendMessage.ts";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import { Info, df } from "duplicatedFilesCleanerIncognito";
import duplicatedFilesCleaner, { duplicatedConstants } from "../../../duplicatedFilesCleaner.ts";

export default async function info(rawNodes: string[]) {
  const onlyFilesystem = rawNodes.length === 1 && rawNodes[0] === "fs";
  if (onlyFilesystem) {
    if (!duplicatedConstants.fileSystem) return await sendHTMLMessage("File system not configured");
    return await sendHTMLMessage(await getFileSistemInfo(duplicatedConstants.fileSystem));
  }

  const nodes = await validateItems({ rawItems: rawNodes }).catch(() => null);
  if (!nodes) return;

  const nodesInfo = await duplicatedFilesCleaner.getInfo(nodes.length ? nodes : undefined);

  let text = "";

  for (const [node, info] of Object.entries(nodesInfo) as [string, Info][])
    text +=
      `<b>Node index ${node}</b>:\n` +
      `<code>${escapeHtml(objectToTableText(info))
        .replace(/OFFLINE/g, "🔴")
        .replace(/ONLINE/g, "🟢")
        .split("\n")
        .slice(0, -1)
        .join("</code>\n<code>")}</code>` +
      "\n\n";

  if (duplicatedConstants.fileSystem) text += await getFileSistemInfo(duplicatedConstants.fileSystem);

  return await sendHTMLMessage(text.trim());
}

async function getFileSistemInfo(fileSystem: string) {
  return (
    `<b>File system</b>:\n` +
    `<code>${escapeHtml(await df(["-h", fileSystem, "--output=used,avail,pcent"]))}</code>`
  );
}
