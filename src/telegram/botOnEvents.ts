import bot from "./initBot.ts";
import sendMessage from "./sendMessage.ts";
import handleError from "../utils/handleError.ts";
import handleTextMessage from "./handlers/handleTextMessage.ts";
import { lastErrorTimes, ignore } from "../utils/variables.ts";

const errorKeys = Object.keys(ignore).sort((a, b) => a.length - b.length) as (keyof typeof ignore)[];
type Type = typeof errorKeys[number] | "all";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      if (/^ignore/i.test(ctx.message.text)) {
        const messageParts = ctx.message.text.split(" ");
        let number = 0;
        let type: Type = "docker";

        if (messageParts.length === 2) number = Number(messageParts[1]);
        else if (messageParts.length > 2) {
          type = messageParts[1] as Type;
          number = Number(messageParts[2]);
        }

        if (type !== "all" && !errorKeys.includes(type))
          return await sendMessage(
            `Valid types:\n- <code>${[...errorKeys, "all"].join("</code>\n- <code>")}</code>`,
            undefined,
            { parse_mode: "HTML" }
          );

        for (const t of type === "all" ? errorKeys : [type]) {
          ignore[t].from = new Date();
          ignore[t].minutes = number || 0;
        }

        return await sendMessage(`Ignoring ${type} for ${number || 0} minutes.`);
      }

      if (/^(restart|reset)/i.test(ctx.message.text)) {
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.");
      }

      await handleTextMessage(ctx.chat.id, ctx.message.text);
    } catch (e) {
      handleError(e);
    }
});
