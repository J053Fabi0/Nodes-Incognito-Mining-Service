import bot from "./initBot.ts";
import { InputFile } from "grammy";
import sendMessage from "./sendMessage.ts";
import handleError from "../utils/handleError.ts";
import { wkhtmltoimage } from "../utils/commands.ts";
import { lastErrorTimes } from "../utils/variables.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import getShouldBeOffline from "../utils/getShouldBeOffline.ts";
import emojisCodes from "../utils/emojisCodes.ts";

const allKeys = ["name", "role", "isSlashed", "isOldVersion", "alert", "epochsToNextEvent"] as const;
const booleanKeys = ["isSlashed", "isOldVersion", "alert"] as const;
type Keys = typeof allKeys[number];

bot.on("message", async (ctx) => {
  if (ctx?.chat?.id === 861616600 && ctx.message.text)
    try {
      if (ctx.message.text === "restart" || ctx.message.text === "reset") {
        for (const key of Object.keys(lastErrorTimes)) delete lastErrorTimes[key];
        await sendMessage("Reset successful.");
      }

      const keys: Keys[] = [];
      let nodes = await getNodesStatus();

      if (/^\/?(full|completo|todo|all|f)/gi.test(ctx.message?.text || "")) keys.push(...allKeys);
      else {
        // minimal information to show
        keys.push("name", "role", "epochsToNextEvent");

        // get the keys that are relevant
        for (const key of booleanKeys) if (nodes.find((node) => node[key])) keys.push(key);

        // filter the nodes that are relevant
        nodes = nodes.filter((node) => {
          if (node.status === "OFFLINE" && !getShouldBeOffline(node)) return true;
          for (const key of booleanKeys) if (node[key]) return true;
          return false;
        });
      }

      if (!nodes.length) {
        await sendMessage("Everything is alright. Send /full or /fulltext to get all the information.");
        return;
      }

      const normalizedNodes = nodes.map((node) => ({
        ...node,
        alert: node.alert ? "Yes" : "No",
        isSlashed: node.isSlashed ? "Yes" : "No",
        isOldVersion: node.isOldVersion ? "Yes" : "No",
        role: node.role.charAt(0) + node.role.slice(1).toLowerCase(),
        status: node.status === "OFFLINE" ? (getShouldBeOffline(node) ? "🔴" : "⚠️") : "🟢",
      }));

      // for text-only
      if (/(text|t)$/i.test(ctx.message.text)) {
        const maxLength = keys.reduce(
          (obj, key) =>
            Object.assign(obj, {
              [key]: Math.max(...normalizedNodes.map((node) => `${node[key]}`.length), key.length),
            }),
          {} as Record<Keys, number>
        );

        const information =
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
                `${otherData.status} ${name}: ${" ".repeat(maxLength.name - name.length)}` +
                (keys.slice(1) as Exclude<Keys, "name">[])
                  .map(
                    (key, i) =>
                      otherData[key] +
                      (i === keys.length - 2 ? "" : "," + " ".repeat(maxLength[key] - `${otherData[key]}`.length))
                  )
                  .join(" ")
            )
            .join("</code>\n<code>") +
          "</code>";

        return await sendMessage(information, ctx.chat.id, { parse_mode: "HTML" });
      }

      // further normalization to use emojis
      for (const node of normalizedNodes) {
        for (const key of booleanKeys) node[key] = node[key] === "Yes" ? "⚠️" : "No";
        if (node.role === "Pending") node.role = "⏳";
        if (node.role === "Committee") node.role = "⛏";
      }

      const newKeys = [keys[0], "status", ...keys.slice(1)] as (Keys | "status")[];
      await Deno.writeTextFile(
        "./full.html",
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${await Deno.readTextFile("./src/html/markdown_css.css")}
            </style>
          </head>
          <body>
            <table>
              <tr>
                <th>
                  ${newKeys
                    .map((key) => (key.startsWith("is") ? key.slice(2) : key))
                    .map((key) => `${key.charAt(0).toUpperCase()}${key.slice(1)}`)
                    .join("</th>\n<th>")}
                </th>
              </tr>
              <tr>
                <td>
                  ${normalizedNodes
                    .map((data) =>
                      newKeys
                        .map((key) =>
                          emojisCodes[data[key]]
                            ? `<img src="https://abs.twimg.com/emoji/v2/svg/${
                                emojisCodes[data[key]]
                              }.svg" class="emoji">`
                            : data[key]
                        )
                        .join("</td>\n<td>")
                    )
                    .join("</td>\n</tr>\n<tr>\n<td>")}
                </td>
              </tr>
            </table>
          </body>
        </html>
        `
      );
      await wkhtmltoimage(["--width", "0", "full.html", "full.png"]).catch(() => {});
      await bot.api.sendPhoto(ctx.chat.id, new InputFile("./full.png"));
    } catch (e) {
      handleError(e);
    }
});
