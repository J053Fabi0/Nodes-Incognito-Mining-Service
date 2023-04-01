import bot from "./initBot.ts";
import info from "./handlers/info.ts";
import { Context, Filter } from "grammy";
import sendMessage from "./sendMessage.ts";
import ignore from "./handlers/handleIgnore.ts";
import handleHelp from "./handlers/handleHelp.ts";
import handleError from "../utils/handleError.ts";
import handleDocker from "./handlers/handleDocker.ts";
import handleDelete from "./handlers/handleDelete.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleCopyOrMove from "./handlers/handleCopyOrMove.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";

async function onMessage(ctx: Filter<Context, "message">) {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const [command, ...args] = ctx.message.text.split(" ").filter((x) => x.trim());

      switch (command.match(/\/?(\w+)/)?.[1].toLowerCase()) {
        case "help":
          return await handleHelp();

        case "docker":
          return await handleDocker(args);

        case "ignore":
          return await ignore(args);

        case "info":
        case "status":
          return await info(args);

        case "copy":
          return await handleCopyOrMove(args, "copy");

        case "move":
          return await handleCopyOrMove(args, "move");

        case "delete":
          return await handleDelete(args);

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
