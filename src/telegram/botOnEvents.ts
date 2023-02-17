import bot from "./initBot.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import sendMessage from "./sendMessage.ts";

type Keys = "name" | "role" | "isSlashed" | "isOldVersion" | "epochsToNextEvent";

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600)
    try {
      if (ctx.message?.text === "restart" || ctx.message?.text === "reset")
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];

      const keys: Keys[] = ["name", "role", "isSlashed"];

      if (/full|completo|todo|all/gi.test(ctx.message?.text || "")) keys.push("isOldVersion", "epochsToNextEvent");

      const nodes = (await getNodesStatus()).map((node) => ({
        ...node,
        isSlashed: node.isSlashed ? "Yes" : "No",
        isOldVersion: node.isOldVersion ? "Yes" : "No",
        status: node.status === "OFFLINE" ? "Down" : "Running",
        role: node.role.charAt(0) + node.role.slice(1).toLowerCase(),
      }));

      const maxLength = keys.reduce(
        (obj, key) =>
          Object.assign(obj, { [key]: Math.max(...nodes.map((node) => `${node[key]}`.length), key.length) }),
        {} as Record<Keys, number>
      );

      await sendMessage(
        "<code>⚪️ " +
          `${keys
            .map(
              (key) =>
                `${key.charAt(0).toUpperCase()}${key.slice(1)}${" ".repeat(maxLength[key] - key.length + 1)}`
            )
            .join(" ")}` +
          "</code>\n\n<code>" +
          nodes
            .map(
              ({ name, ...otherData }) =>
                (otherData.status === "OFFLINE" ? "🔴" : "🟢") +
                ` ${name}: ${" ".repeat(maxLength.name - name.length)}` +
                (keys.slice(1) as Exclude<Keys, "name">[])
                  .map((key) => `${otherData[key]},` + " ".repeat(maxLength[key] - `${otherData[key]}`.length))
                  .join(" ")
            )
            .join("</code>\n<code>") +
          "</code>",
        ctx.chat.id,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      handleError(e);
    }
});
