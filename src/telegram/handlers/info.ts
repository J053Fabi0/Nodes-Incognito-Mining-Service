import { escapeHtml } from "escapeHtml";
import { sendHTMLMessage } from "../sendMessage.ts";
import objectToTableText from "../objectToTableText.ts";
import { Info, df } from "duplicatedFilesCleanerIncognito";
import duplicatedFilesCleaner, { duplicatedConstants } from "../../../duplicatedFilesCleaner.ts";

const { fileSystem } = duplicatedConstants;

export default async function info(messageParts: string[]) {
  const nodes = [];
  if (messageParts.length > 1) {
    // check if the nodes are valid
    const usedNodes = [...duplicatedFilesCleaner.usedNodes];
    for (const node of messageParts.slice(1)) {
      const nodeNumber = Number(node);
      if (isNaN(nodeNumber))
        return await sendHTMLMessage(
          `Invalid node: <code>${node}</code>.\n\n` +
            `Used nodes:\n- <code>${usedNodes.join("</code>\n- <code>")}</code>`
        );
      else if (!usedNodes.includes(nodeNumber))
        return await sendHTMLMessage(
          `Node <code>${node}</code> is not found.\n\n` +
            `Used nodes:\n- <code>${usedNodes.join("</code>\n- <code>")}</code>`
        );
      else nodes.push(nodeNumber);
    }
  }

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

  if (fileSystem)
    text +=
      `<b>File system</b>:\n` +
      `<code>${escapeHtml(await df(["-h", fileSystem, "--output=used,avail,pcent"]))}</code>`;

  return await sendHTMLMessage(text.trim());
}
