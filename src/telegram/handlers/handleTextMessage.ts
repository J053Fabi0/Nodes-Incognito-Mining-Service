import bot from "../initBot.ts";
import { InputFile } from "grammy";
import sendMessage from "../sendMessage.ts";
import emojisCodes from "../../utils/emojisCodes.ts";
import { wkhtmltoimage } from "../../utils/commands.ts";
import getNodesStatus from "../../utils/getNodesStatus.ts";
import getShouldBeOffline from "../../utils/getShouldBeOffline.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";

const allKeys = ["name", "role", "isSlashed", "isOldVersion", "alert", "epochsToNextEvent"] as const;
const booleanKeys = ["isSlashed", "isOldVersion", "alert"] as const;
type Keys = typeof allKeys[number];

let lastPhotoId: string | undefined;
let lastPhotoIdTime: number | undefined;

export default async function handleTextMessage(chatId: number, text: string) {
  const keys: Keys[] = [];
  let nodes = await getNodesStatus();

  if (/^\/?(full|completo|todo|all|f)/gi.test(text || "")) keys.push(...allKeys);
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
    syncState: node.syncState.charAt(0) + node.syncState.slice(1).toLowerCase(),
    status: node.status === "OFFLINE" ? (getShouldBeOffline(node) ? "🔴" : "⚠️") : "🟢",
  }));

  // for text-only
  if (/(text|t)$/i.test(text)) {
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
          (key) => `${key.charAt(0).toUpperCase()}${key.slice(1)}${" ".repeat(maxLength[key] - key.length + 1)}`
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

    return await sendMessage(information, chatId, { parse_mode: "HTML" });
  }

  // further normalization to use emojis
  for (const node of normalizedNodes) {
    for (const key of booleanKeys) node[key] = node[key] === "Yes" ? "Yes ⚠️" : "No";
    if (node.role === "Pending") node.role = "⏳";
    if (node.role === "Committee") node.role = "⛏";
    if (node.syncState.endsWith("stall")) node.syncState += " ⚠️";
  }

  // generate new keys for the table
  const newKeys = [keys[0], "status", ...keys.slice(1)] as (Keys | "status" | "syncState")[];

  // if every syncState is "-", don't show it
  const shouldShowSyncState = normalizedNodes.every((node) => node.syncState === "-") === false;
  if (shouldShowSyncState) newKeys.push("syncState" as const);

  const html = `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${Deno.readTextFileSync("./src/html/markdown_css.css")}
            </style>
          </head>
          <body>
            <table>
              <tr>
                <th>
                  ${newKeys
                    .map((key) => {
                      switch (key) {
                        case "isOldVersion":
                          return `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes["👴"]}.svg" class="emoji">`;

                        case "status":
                          return `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes["🔌"]}.svg" class="emoji">`;

                        case "isSlashed":
                          return `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes["🔪"]}.svg" class="emoji">`;

                        case "epochsToNextEvent":
                          return `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes["➡️"]}.svg" class="emoji">`;

                        case "alert":
                          return `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes["🐢"]}.svg" class="emoji">`;

                        default:
                          return key.charAt(0).toUpperCase() + key.slice(1);
                      }
                    })
                    .join("</th>\n<th>")}
                </th>
              </tr>
              <tr>
                <td>
                  ${normalizedNodes
                    .map((data) =>
                      newKeys
                        .map((key) =>
                          data[key]
                            .toString()
                            .split(" ")
                            .map((char) =>
                              emojisCodes[char]
                                ? `<img src="https://abs.twimg.com/emoji/v2/svg/${emojisCodes[char]}.svg" class="emoji">`
                                : char
                            )
                            .join(" ")
                        )
                        .join("</td>\n<td>")
                    )
                    .join("</td>\n</tr>\n<tr>\n<td>")}
                </td>
              </tr>
            </table>
          </body>
        </html>`;

  // if the html hasn't changed, send the last photo
  if (lastPhotoId && lastPhotoIdTime && Deno.readTextFileSync("./full.html") === html) {
    const timeString = rangeMsToTimeDescription(lastPhotoIdTime);
    await bot.api.sendPhoto(chatId, lastPhotoId, {
      caption: `<i>Nothing changed since last time you checked ${timeString} ago.</i>`,
      parse_mode: "HTML",
    });
  } else {
    Deno.writeTextFileSync("./full.html", html);
    await wkhtmltoimage(["--width", "0", "full.html", "full.png"]).catch((e) => {
      if (e.message.includes("Done")) return;
      throw e;
    });
    const { photo } = await bot.api.sendPhoto(chatId, new InputFile("./full.png"));
    lastPhotoId = photo[0].file_id;
    lastPhotoIdTime = Date.now();
  }
}
