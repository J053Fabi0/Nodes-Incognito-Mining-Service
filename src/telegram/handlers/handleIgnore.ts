import { ignore as ignoreObj } from "../../utils/variables.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";

const errorKeys = Object.keys(ignoreObj).sort((a, b) => a.length - b.length) as (keyof typeof ignoreObj)[];
type Type = typeof errorKeys[number] | "all";

export default async function handleIgnore(args: string[]) {
  let number = 0; // default value is 0, to disable the ignore
  let type: Type = "docker";

  if (args.length === 1) {
    // the first argument could be the type if it's not a number
    if (isNaN(Number(args[0]))) type = args[0] as Type;
    // if it is a number, it's the number of minutes to ignore the de default type docker
    else number = Number(args[0]) || number;
  } else if (args.length > 1) {
    type = args[0] as Type;
    number = Number(args[1]) || number;
  }

  if (number < 0) return await sendHTMLMessage("The number of minutes must be positive.");

  if ((type !== "all" && !errorKeys.includes(type)) || type.toLowerCase() === "codes")
    return await sendHTMLMessage(
      `Valid types:\n- <code>${["all", ...errorKeys].join("</code>\n- <code>")}</code>`
    );

  for (const t of type === "all" ? errorKeys : [type]) {
    ignoreObj[t].from = new Date();
    ignoreObj[t].minutes = number;
  }

  return await sendMessage(`Ignoring ${type} for ${number} minutes.`);
}
