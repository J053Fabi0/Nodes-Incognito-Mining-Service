import bot from "./initBot.ts";
import sendMessage from "./sendMessage.ts";
import handleError from "../utils/handleError.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import { lastErrorTimes, ignoreDocker } from "../utils/variables.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      if (/ignore/i.test(ctx.message.text)) {
        const minutes = Number(ctx.message.text.match(/\d+/g)?.[0]);
        if (!isNaN(minutes)) {
          ignoreDocker.minutes = minutes;
          ignoreDocker.from = new Date();
          await sendMessage(`Ignoring docker for ${minutes} minutes.`);
        } else await sendMessage("Invalid input.");
        return;
      }

      if (/restart|reset/i.test(ctx.message.text)) {
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.");
      }

      await handleTextMessage(ctx.chat.id, ctx.message.text);
    } catch (e) {
      handleError(e);
    }
});
