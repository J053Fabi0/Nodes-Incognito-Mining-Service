import { ignore as ignoreObj } from "../../utils/variables.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";

const errorKeys = Object.keys(ignoreObj).sort((a, b) => a.length - b.length) as (keyof typeof ignoreObj)[];
type Type = typeof errorKeys[number] | "all";

export default async function ignore(messageParts: string[]) {
  let number = 0;
  let type: Type = "docker";

  if (messageParts.length === 2) number = Number(messageParts[1]) || 0;
  else if (messageParts.length > 2) {
    type = messageParts[1] as Type;
    number = Number(messageParts[2]) || 0;
  }

  if (type !== "all" && !errorKeys.includes(type))
    return await sendHTMLMessage(
      `Valid types:\n- <code>${["all", ...errorKeys].join("</code>\n- <code>")}</code>`
    );

  for (const t of type === "all" ? errorKeys : [type]) {
    ignoreObj[t].from = new Date();
    ignoreObj[t].minutes = number;
  }

  return await sendMessage(`Ignoring ${type} for ${number} minutes.`);
}
