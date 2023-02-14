import bot from "./initBot.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600)
    try {
      if (ctx.message?.text === "restart" || ctx.message?.text === "reset")
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];

      ctx.replyWithHTML(
        "<code>" +
          (await getNodesStatus())
            .map(({ name, status, isSlashed }) => `${name}: ${status}, ${isSlashed}`)
            .join("\n") +
          "</code>"
      );
    } catch (e) {
      handleError(e);
    }
});
