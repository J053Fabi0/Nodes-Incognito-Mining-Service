import bot from "./initBot.ts";
import info from "./handlers/info.ts";
import ignore from "./handlers/ignore.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import sendMessage, { sendHTMLMessage } from "./sendMessage.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      const messageParts = ctx.message.text.split(" ");

      switch (messageParts[0].toLocaleLowerCase()) {
        case "help":
          return await sendHTMLMessage(
            "<b>Available commands</b>\n\n" +
              [
                ["ignore [code=docker] [minutes=0]", "Ignore an error code for an amount of minutes"],
                ["ignore codes", "List the error codes"],
                ["reset", "Reset the timings of the errors"],
                ["info [...nodeIndexes=all]", "Get the docker status, files of shards and system info"],
              ]
                .map(([command, description]) => `- ${description}.\n<code>${command}</code>`)
                .join("\n\n")
          );

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
