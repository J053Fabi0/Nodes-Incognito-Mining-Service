import bot from "./initBot.ts";
import { escapeHtml } from "escapeHtml";
import handleError from "../utils/handleError.ts";
import { Info } from "duplicatedFilesCleanerIncognito";
import { lastErrorTimes, ignore } from "../utils/variables.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";

const errorKeys = Object.keys(ignore).sort((a, b) => a.length - b.length) as (keyof typeof ignore)[];
type Type = typeof errorKeys[number] | "all";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const messageParts = ctx.message.text.split(" ");
      switch (messageParts[0].toLocaleLowerCase()) {
        case "ignore": {
          let number = 0;
          let type: Type = "docker";

          if (messageParts.length === 2) number = Number(messageParts[1]);
          else if (messageParts.length > 2) {
            type = messageParts[1] as Type;
            number = Number(messageParts[2]);
          }

          if (type !== "all" && !errorKeys.includes(type))
            return await sendHTMLMessage(
              `Valid types:\n- <code>${["all", ...errorKeys].join("</code>\n- <code>")}</code>`
            );

          for (const t of type === "all" ? errorKeys : [type]) {
            ignore[t].from = new Date();
            ignore[t].minutes = number || 0;
          }

          return await sendMessage(`Ignoring ${type} for ${number || 0} minutes.`);
        }

        case "restart":
        case "reset": {
          for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
          return await sendMessage("Reset successful.");
        }

        case "info": {
          const nodes = [];
          if (messageParts.length > 1) {
            // check if the nodes are valid
            const usedNodes = [...duplicatedFilesCleaner.usedNodes];
            for (const node of messageParts.slice(1)) {
              const nodeNumber = Number(node);
              if (isNaN(nodeNumber))
                return await sendHTMLMessage(
                  `Invalid node: <code>${node}</code>.\n\n` +
                    `Used nodes:\n-<code>${usedNodes.join("</code>\n- <code>")}</code>`
                );
              else if (!usedNodes.includes(nodeNumber))
                return await sendHTMLMessage(
                  `Node <code>${node}</code> is not found.\n\n` +
                    `Used nodes:\n-<code>${usedNodes.join("</code>\n- <code>")}</code>`
                );
              else nodes.push(nodeNumber);
            }
          }

          const nodesInfo = await duplicatedFilesCleaner.getInfo(nodes.length ? nodes : undefined);

          let text = "";

          for (const [node, info] of Object.entries(nodesInfo) as [string, Info][])
            text +=
              `<b>${node}</b>:\n` +
              `<code>${objectToTableText(info)
                .replace(/OFFLINE/g, "🔴")
                .replace(/ONLINE/g, "🟢")
                .split("\n")
                .slice(0, -1)
                .join("</code>\n<code>")}</code>` +
              "\n\n";

          return await sendHTMLMessage(escapeHtml(text.trim()));
        }

        default: {
          await handleTextMessage(ctx.chat.id, ctx.message.text);
        }
      }
    } catch (e) {
      handleError(e);
    }
});

function objectToTableText(obj: Record<string, string | number>) {
  const keys = Object.keys(obj);
  // maxLength in the keys
  const maxLength = Math.max(...keys.map((key) => key.length));

  return keys.reduce(
    (text, key) =>
      (text +=
        `${key.charAt(0).toUpperCase()}${key.slice(1).toLocaleLowerCase()}:` +
        `${" ".repeat(maxLength - key.length + 1)}${obj[key]}\n`),
    ""
  );
}
