import bot from "./initBot.ts";
import info from "./handlers/info.ts";
import ignore from "./handlers/ignore.ts";
import sendMessage from "./sendMessage.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const messageParts = ctx.message.text.split(" ");

      switch (messageParts[0].toLocaleLowerCase()) {
        case "ignore":
          return ignore(messageParts);

        case "restart":
        case "reset": {
          for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
          return await sendMessage("Reset successful.");
        }

        case "info":
          return await info(messageParts);

        default:
          return await handleTextMessage(ctx.chat.id, ctx.message.text);
      }
    } catch (e) {
      handleError(e);
    }
});
