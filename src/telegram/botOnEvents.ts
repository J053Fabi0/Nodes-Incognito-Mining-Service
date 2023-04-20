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
import { getTextInstructionsToMoveOrDelete } from "../utils/instructionsToMoveOrDelete.ts";

import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";

let lastMessages = ["full"];

async function onMessage(ctx: Filter<Context, "message">) {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const rawText = ctx.message.text;
      const texts = /^\/?r(?:epeat)?$/.test(rawText) ? lastMessages : rawText.split("\n").filter((x) => x.trim());
      lastMessages = texts;

      for (const text of texts) {
        const [command, ...args] = text.split(" ").filter((x) => x.trim());

        switch (command.match(/\/?(\w+)/)?.[1].toLowerCase()) {
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
            await handleCopyOrMove(args, "copy");
            break;
          }

          case "move": {
            await handleCopyOrMove(args, "move");
            break;
          }

          case "delete": {
            await handleDelete(args);
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

          case "reset":
          case "restart": {
            for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
            await sendMessage("Reset successful.");
            break;
          }

          default:
            await handleTextMessage(ctx.message.text);
        }
      }

      // if any text was to copy, move or delete, send the info
      if (texts.some((text) => text.match(/^(copy|move|delete) /))) handleInfo();
    } catch (e) {
      handleError(e);
    }
}

bot.on("message", (ctx) => void onMessage(ctx));
