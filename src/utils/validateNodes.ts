import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";

export default async function validateNodes(rawNodes: string[]) {
  const nodes = [];
  if (rawNodes.length !== 0) {
    // check if the nodes are valid
    const usedNodes = [...duplicatedFilesCleaner.usedNodes];
    for (const node of rawNodes) {
      const nodeNumber = Number(node);
      if (isNaN(nodeNumber)) {
        await sendHTMLMessage(
          `Invalid node: <code>${node}</code>.\n\n` +
            `Used nodes:\n- <code>${usedNodes.join("</code>\n- <code>")}</code>`
        );
        throw new Error(`Invalid node ${node}`);
      } else if (!usedNodes.includes(nodeNumber)) {
        await sendHTMLMessage(
          `Node <code>${node}</code> is not found.\n\n` +
            `Used nodes:\n- <code>${usedNodes.join("</code>\n- <code>")}</code>`
        );
        throw new Error(`Node ${node} not found`);
      } else nodes.push(nodeNumber);
    }
  }
  return nodes;
}
