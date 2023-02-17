import bot from "./initBot.ts";
import handleError from "../utils/handleError.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import sendMessage from "./sendMessage.ts";

const allKeys = ["name", "role", "isSlashed", "isOldVersion", "alert", "epochsToNextEvent"] as const;
type Keys = typeof allKeys[number];

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600)
    try {
      if (ctx.message?.text === "restart" || ctx.message?.text === "reset")
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];

      const keys: Keys[] = [];
      let nodes = await getNodesStatus();

      if (/full|completo|todo|all/gi.test(ctx.message?.text || "")) keys.push(...allKeys);
      else {
        // minimal information to show
        keys.push("name", "role", "epochsToNextEvent");
        const booleanKeys = ["isSlashed", "isOldVersion", "alert"] as const;

        // get the keys that are relevant
        for (const key of booleanKeys) if (nodes.find((node) => node[key])) keys.push(key);

        // filter the nodes that are relevant
        nodes = nodes.filter((node) => {
          if (node.status === "OFFLINE") return true;
          for (const key of booleanKeys) if (node[key]) return true;
          return false;
        });
      }

      if (!nodes.length) {
        await sendMessage("Everything is alright. Send /full to get all the information.");
        return;
      }

      const normalizedNodes = nodes.map((node) => ({
        ...node,
        isSlashed: node.isSlashed ? "Yes" : "No",
        isOldVersion: node.isOldVersion ? "Yes" : "No",
        role: node.role.charAt(0) + node.role.slice(1).toLowerCase(),
      }));

      const maxLength = keys.reduce(
        (obj, key) =>
          Object.assign(obj, {
            [key]: Math.max(...normalizedNodes.map((node) => `${node[key]}`.length), key.length),
          }),
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
          normalizedNodes
            .map(
              ({ name, ...otherData }) =>
                (otherData.status === "OFFLINE" ? "🔴" : "🟢") +
                ` ${name}: ${" ".repeat(maxLength.name - name.length)}` +
                (keys.slice(1) as Exclude<Keys, "name">[])
                  .map(
                    (key, i) =>
                      `${otherData[key]}${i === keys.length - 2 ? "" : ","}` +
                      " ".repeat(maxLength[key] - `${otherData[key]}`.length)
                  )
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
