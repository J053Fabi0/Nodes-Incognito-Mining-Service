import bot from "../initBots.ts";
import { ADMIN_ID } from "../../env.ts";
import { InputFile } from "grammy/mod.ts";
import getShouldBeOnline from "../../utils/getShouldBeOnline.ts";
import { optipng, wkhtmltoimage } from "../../utils/commands.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import emojisCodes, { splitEmoji } from "../../utils/emojisCodes.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";
import getNodesStatus, { NodeRoles, NodeStatus } from "../../utils/getNodesStatus.ts";

const allKeys = [
  "dockerIndex",
  "role",
  "shard",
  "isSlashed",
  "isOldVersion",
  "alert",
  "epochsToNextEvent",
] as const;
const booleanKeys = ["isSlashed", "isOldVersion", "alert"] as const;
type Keys = (typeof allKeys)[number];

let lastPhotoId: string | undefined;
let lastPhotoIdTime: number | undefined;
let lastText = "";
let lastTextTime: number | undefined;

export default async function handleTextMessage(
  text: "text" | "full" | "fulltext",
  options?: CommandOptions
): Promise<CommandResponse> {
  const keys: Keys[] = [];
  let nodes = await getNodesStatus();

  if (text === "full" || text === "fulltext") keys.push(...allKeys);
  else {
    // minimal information to show
    keys.push("dockerIndex", "role", "epochsToNextEvent");

    // get the keys that are relevant
    for (const key of booleanKeys) if (nodes.find((node) => node[key])) keys.push(key);

    // filter the nodes that are relevant
    nodes = nodes.filter((node) => {
      if (node.syncState.endsWith("STALL")) return true;
      for (const key of booleanKeys) if (node[key]) return true;
      if (node.status === "OFFLINE" && getShouldBeOnline(node)) return true;
      return false;
    });
  }

  if (!nodes.length) {
    const response = "Everything is alright. Send /full or /fulltext to get all the information.";
    if (options?.telegramMessages)
      await sendMessage(response, undefined, { disable_notification: options?.silent });
    return { successful: true, response };
  }

  // for text-only
  if (text === "text") {
    const response = getMessageText(keys, nodes);
    if (options?.telegramMessages)
      await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
    return { successful: true, response };
  }

  // generate new keys for the table
  const newKeys = [keys[0], "status", ...keys.slice(1)] as (Keys | "status" | "syncState")[];

  // if every syncState is "-", don't show it
  const shouldShowSyncState = nodes.every((node) => node.syncState === "-") === false;
  if (shouldShowSyncState) newKeys.push("syncState" as const);

  const { html, table } = getTableHTML(newKeys, nodes);

  // if the html hasn't changed, send the last photo
  if (lastPhotoId && lastPhotoIdTime && Deno.readTextFileSync("./full.html") === html) {
    const timeString = rangeMsToTimeDescription(lastPhotoIdTime);
    await bot.api.sendDocument(ADMIN_ID, lastPhotoId, {
      caption: `<i>Nothing changed since last time you checked ${timeString} ago.</i>`,
      parse_mode: "HTML",
    });
  } else {
    Deno.writeTextFileSync("./full.html", html);
    await wkhtmltoimage(["--width", "0", "--quality", "100", "full.html", "full.png"]).catch((e) => {
      if (e.message.includes("Done")) return e.message;
      throw e;
    });
    await optipng(["full.png"]).catch((e) => {
      if (e.message.includes("decrease")) return e.message;
      throw e;
    });
    const { document } = await bot.api.sendDocument(ADMIN_ID, new InputFile("./full.png"));
    lastPhotoId = document.file_id;
    lastPhotoIdTime = Date.now();
  }

  return { successful: true, response: table };
}

function getMessageText(keys: (Keys | "status")[], nodes: NodeStatus[]) {
  const shorterKeys = keys.map((key) => {
    switch (key) {
      case "isSlashed":
        return "Sl";
      case "isOldVersion":
        return "Ol";
      case "epochsToNextEvent":
        return "Nex";
      case "alert":
        return "Al";
      case "shard":
        return "S";
      default:
        return key;
    }
  });

  const normalizedNodes: Record<(typeof shorterKeys)[number], string | number>[] = nodes.map((node) => ({
    ...node,
    S: node.shard,
    Nex: node.epochsToNextEvent,
    Al: node.alert ? "Yes" : "No",
    Sl: node.isSlashed ? "Yes" : "No",
    Ol: node.isOldVersion ? "Yes" : "No",
    role: node.role.substring(0, 1) + node.role.substring(1, 4).toLowerCase(),
    syncState: node.syncState.charAt(0) + node.syncState.slice(1).toLowerCase(),
    status: node.status === "OFFLINE" ? (getShouldBeOnline(node) ? "⚠️" : "🔴") : "🟢",
  }));

  const maxLength = shorterKeys.reduce(
    (obj, key) =>
      Object.assign(obj, {
        [key]: Math.max(...normalizedNodes.map((node) => `${node[key]}`.length), key.length),
      }),
    {} as Record<(typeof shorterKeys)[number], number>
  );

  const text =
    "<code>⚪️ " +
    shorterKeys
      .map((key) => `${key.charAt(0).toUpperCase()}${key.slice(1)}${" ".repeat(maxLength[key] - key.length + 1)}`)
      .join(" ") +
    "</code>\n\n<code>" +
    normalizedNodes
      .map(
        ({ dockerIndex, ...otherData }) =>
          `${otherData.status} ${dockerIndex}: ${" ".repeat(
            maxLength.dockerIndex - (dockerIndex as string).length
          )}` +
          (shorterKeys.slice(1) as Exclude<(typeof shorterKeys)[number], "dockerIndex">[])
            .map(
              (key, i) =>
                otherData[key] +
                (i === keys.length - 2 ? "" : "," + " ".repeat(maxLength[key] - `${otherData[key]}`.length))
            )
            .join(" ")
      )
      .join("</code>\n<code>") +
    "</code>";

  if (lastText === text && lastTextTime) {
    const timeString = rangeMsToTimeDescription(lastTextTime);
    return `${text}\n\n<i>Nothing changed since last time you checked ${timeString} ago.</i>`;
  }

  lastText = text;
  lastTextTime = Date.now();

  return text;
}

type NewKeys = Keys | "status" | "syncState";
type NormalizedNode = Record<NewKeys, string | number>;

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};
const emojiURL = "https://abs.twimg.com/emoji/v2";
const img = (emoji: string, key = "") =>
  `<img title="${key}" src="${emojiURL}/svg/${emojisCodes[emoji]}.svg" class="emoji" width="27" style="display: inline">`;
export function roleToEmoji(role: NodeRoles) {
  switch (role) {
    case "PENDING":
      return "⏳";
    case "COMMITTEE":
      return "⚡";
    case "WAITING":
      return "🆕";
    case "SYNCING":
      return "⏳⏳";
    case "NOT_STAKED":
      return "⚠️";
    default:
      return "❔";
  }
}
function getTableHTML(newKeys: NewKeys[], nodes: NodeStatus[]): { html: string; table: string } {
  const normalizedNodes: NormalizedNode[] = nodes.map((node) => ({
    dockerIndex: node.dockerIndex,
    shard: node.shard,
    epochsToNextEvent: node.epochsToNextEvent,
    alert: node.alert ? "Yes ⚠️" : "No",
    isSlashed: node.isSlashed ? "Yes ⚠️" : "No",
    isOldVersion: node.isOldVersion ? "Yes ⚠️" : "No",
    role: roleToEmoji(node.role),
    syncState:
      node.syncState.charAt(0) +
      node.syncState.slice(1).toLowerCase() +
      (node.syncState.endsWith("STALL") ? " ⚠️" : ""),
    status: node.status === "OFFLINE" ? (getShouldBeOnline(node) ? "⚠️" : "🔴") : "🟢",
  }));

  const table = `
    <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
      <tr>
        <th class="${styles.th}">
          ${newKeys
            .map((key) => {
              switch (key) {
                case "dockerIndex":
                  return "i";

                case "isOldVersion":
                  return img("👴", key);

                case "status":
                  return img("🔌", key);

                case "isSlashed":
                  return img("🔪", key);

                case "epochsToNextEvent":
                  return img("➡️", key);

                case "alert":
                  return img("🐢", key);

                case "shard":
                  return "Sh";

                default:
                  return key.charAt(0).toUpperCase() + key.slice(1);
              }
            })
            .join(`</th>\n<th class="${styles.th}">`)}
        </th>
      </tr>
      <tr>
        <td class="${styles.td}">
          ${normalizedNodes
            .map((data) =>
              newKeys
                .map((key) =>
                  splitEmoji(data[key].toString())
                    .map((char) => (emojisCodes[char] ? img(char) : char))
                    .join("")
                )
                .join(`</td>\n<td class="${styles.td}">`)
            )
            .join(`</td>\n</tr>\n<tr>\n<td class="${styles.td}">`)}
        </td>
      </tr>
    </table>`;

  const html = `
    <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${Deno.readTextFileSync("./static/styles/markdown_css.css")}
          </style>
        </head>
        <body>
          ${table}
        </body>
      </html>`;

  // replace all new lines with nothing and trim every line
  return {
    html: html
      .split("\n")
      .map((line) => line.trim())
      .join(""),
    table: table
      .split("\n")
      .map((line) => line.trim())
      .join(""),
  };
}
