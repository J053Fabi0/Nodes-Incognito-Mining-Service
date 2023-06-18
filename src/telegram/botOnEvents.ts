import bot from "./initBot.ts";
import { Context, Filter } from "grammy/mod.ts";
import handleInfo from "./handlers/handleInfo.ts";
import handleError from "../utils/handleError.ts";
import helpMessage from "../utils/helpMessage.ts";
import handleIgnore from "./handlers/handleIgnore.ts";
import handleDocker from "./handlers/handleDocker.ts";
import handleDelete from "./handlers/handleDelete.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleCopyOrMove from "./handlers/handleCopyOrMove.ts";
import handleErrorsInfo from "./handlers/handleErrorsInfo.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import { getTextInstructionsToMoveOrDelete } from "../utils/getInstructionsToMoveOrDelete.ts";

import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";
import { ADMIN_ID } from "../../env.ts";

let lastMessages = ["full"];
const commands = [
  "f",
  "ft",
  "copy",
  "full",
  "help",
  "info",
  "move",
  "text",
  "reset",
  "delete",
  "docker",
  "errors",
  "ignore",
  "status",
  "fulltext",
  "instructions",
];

async function onMessage(ctx: Filter<Context, "message">) {
  if (ctx?.chat?.id === ADMIN_ID && ctx.message.text)
    try {
      const rawText = ctx.message.text;
      const texts = /^\/?r(?:epeat)?$/.test(rawText) ? lastMessages : rawText.split("\n").filter((x) => x.trim());
      lastMessages = texts;
      let sendInfo = false;

      for (const text of texts) {
        const [command, ...args] = text.split(" ").filter((x) => x.trim());
        const normalizedCommand = command.replace(/^\/+/, "").toLowerCase();

        // if the command fits exactly with one of the possible commands, it is not ambiguous
        const exactCommand = commands.find((c) => c === normalizedCommand);
        const matchingCommands = exactCommand
          ? [exactCommand]
          : commands.filter((c) => c.startsWith(normalizedCommand));
        if (matchingCommands.length > 1) {
          await sendHTMLMessage(
            `Command <code>${normalizedCommand}</code> is ambiguous. Did you mean one of these?\n- <code>` +
              `${matchingCommands.map((c) => `${c} ${args.join(" ")}`).join("</code>\n- <code>")}</code>`
          );
          continue;
        } else if (matchingCommands.length === 0) {
          await sendHTMLMessage(
            `Command <code>${normalizedCommand}</code> not found. Type /help to see the available commands.`
          );
          continue;
        }

        switch (matchingCommands[0]) {
          case "help": {
            await sendHTMLMessage(helpMessage);
            break;
          }

          case "docker": {
            await handleDocker(args);
            break;
          }

          case "ignore": {
            await handleIgnore(args);
            break;
          }

          case "info":
          case "status": {
            await handleInfo(args);
            break;
          }

          case "copy": {
            const successful = await handleCopyOrMove(args, "copy");
            if (successful) sendInfo = true;
            break;
          }

          case "move": {
            const successful = await handleCopyOrMove(args, "move");
            if (successful) sendInfo = true;
            break;
          }

          case "delete": {
            const successful = await handleDelete(args);
            if (successful) sendInfo = true;
            break;
          }

          case "errors": {
            await handleErrorsInfo(args);
            break;
          }

          case "instructions": {
            sendHTMLMessage(await getTextInstructionsToMoveOrDelete());
            break;
          }

          case "reset": {
            for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
            await sendMessage("Reset successful.");
            break;
          }

          default:
            await handleTextMessage(ctx.message.text);
        }
      }

      // if any text was to copy, move or delete, send the info
      if (sendInfo) handleInfo();
    } catch (e) {
      handleError(e);
    }
}

bot.on("message", (ctx) => void onMessage(ctx));
