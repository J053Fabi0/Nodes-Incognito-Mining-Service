import { escapeHtml } from "escapeHtml";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import { getNodes } from "../../controllers/node.controller.ts";
import { getClient } from "../../controllers/client.controller.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

export default async function handleNodeCommand(
  nodes: string[],
  options?: CommandOptions
): Promise<CommandResponse> {
  const nodesNumbers = [...new Set(nodes.map((n) => parseInt(n)).filter((n) => !isNaN(n)))];

  if (nodesNumbers.length === 0) {
    if (options?.telegramMessages)
      await sendMessage("No nodes provided.", undefined, { disable_notification: options?.silent });
    return { successful: false, error: "No nodes provided." };
  }

  const nodesObjects = await getNodes({ dockerIndex: { $in: nodesNumbers } });

  const messages: string[] = [];

  // check if all nodes were found
  const nodesNotFound = nodesNumbers.filter((n) => !nodesObjects.find((node) => node.dockerIndex === n));
  for (const node of nodesNotFound) {
    const errorMessage = `Node <code>${node}</code> not found.`;
    messages.push(errorMessage);
    if (options?.telegramMessages)
      await sendHTMLMessage(errorMessage, undefined, { disable_notification: options?.silent });
  }

  // send the info of the nodes
  for (const node of nodesObjects) {
    let message = "";

    const client = await getClient({ _id: node.client }, { projection: { name: 1, _id: 0 } });
    if (!client) {
      message += `<code>${node.dockerIndex}</code> <b>Client not found</b>`;
      continue;
    } else {
      message += `Index: <code>${node.dockerIndex}</code>.\n`;
      message += `Number: <code>${node.number}</code>.\n`;
      message += `Client: <code>${escapeHtml(client.name)}</code> - <code>${node.client}</code>.\n`;
      message += `Docker version: <code>${node.dockerTag}</code>.\n`;
      message += `RPC Port: <code>${node.rcpPort}</code>.\n`;
      message += `Status: <code>${node.inactive ? "Inactive" : "Active"}</code>.\n`;
      message += `Validator: <code>${node.validator}</code>.\n`;
      message += `Public validator: <code>${node.validatorPublic}</code>.`;
    }

    messages.push(message);
    if (options?.telegramMessages)
      await sendHTMLMessage(message, undefined, { disable_notification: options?.silent });
  }

  return { successful: true, response: messages.join("\n\n") };
}
