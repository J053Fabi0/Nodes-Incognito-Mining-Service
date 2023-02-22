import bot from "./initBot.ts";
import sendMessage from "./sendMessage.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      if (/restart|reset/i.test(ctx.message.text)) {
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.");
      }

      await handleTextMessage(ctx.chat.id, ctx.message.text);
    } catch (e) {
      handleError(e);
    }
});
