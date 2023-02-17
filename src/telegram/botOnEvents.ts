import bot from "./initBot.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import sendMessage from "./sendMessage.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600)
    try {
      if (ctx.message?.text === "restart" || ctx.message?.text === "reset")
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];

      await sendMessage(
        "<b>Name: status, role, isSlashed</b>" +
          "\n<code>" +
          (await getNodesStatus())
            .map(({ name, status, role, isSlashed }) => `${name}: ${status}, ${role}, ${isSlashed}`)
            .join("\n") +
          "</code>",
        ctx.chat.id,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      handleError(e);
    }
});
