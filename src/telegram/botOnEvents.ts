import bot from "./initBot.ts";
import info from "./handlers/info.ts";
import ignore from "./handlers/ignore.ts";
import sendMessage from "./sendMessage.ts";
import handleHelp from "./handlers/handleHelp.ts";
import handleCopy from "./handlers/handleCopy.ts";
import handleError from "../utils/handleError.ts";
import handleDocker from "./handlers/handleDocker.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const [command, ...args] = ctx.message.text.split(" ");

      switch (command.match(/\/?(\w+)/)?.[1].toLocaleLowerCase()) {
        case "help":
          return await handleHelp();

        case "docker":
          return await handleDocker(args);

        case "ignore":
          return await ignore(args);

        case "restart":
        case "reset": {
          for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
          return await sendMessage("Reset successful.");
        }

        case "info":
        case "status":
          return await info(args);

        case "copy":
          return await handleCopy(args);

        default:
          return await handleTextMessage(ctx.chat.id, ctx.message.text);
      }
    } catch (e) {
      handleError(e);
    }
});
