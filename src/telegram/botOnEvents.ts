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

async function onMessage(ctx: Filter<Context, "message">) {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const [command, ...args] = ctx.message.text.split(" ").filter((x) => x.trim());

      switch (command.match(/\/?(\w+)/)?.[1].toLowerCase()) {
        case "help":
          return await sendHTMLMessage(helpMessage);

        case "docker":
          return await handleDocker(args);

        case "ignore":
          return await handleIgnore(args);

        case "info":
        case "status":
          return await handleInfo(args);

        case "copy":
          return await handleCopyOrMove(args, "copy");

        case "move":
          return await handleCopyOrMove(args, "move");

        case "delete":
          return await handleDelete(args);

        case "errors":
          return await handleErrorsInfo(args);

        case "instructions":
          return sendHTMLMessage(await getTextInstructionsToMoveOrDelete());

        case "reset":
        case "restart": {
          for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
          return await sendMessage("Reset successful.");
        }

        default:
          return await handleTextMessage(ctx.message.text);
      }
    } catch (e) {
      handleError(e);
    }
}

bot.on("message", (ctx) => void onMessage(ctx));
