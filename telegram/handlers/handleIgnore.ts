import { ignore } from "../../utils/variables.ts";
import { CommandResponse } from "../submitCommandUtils.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";

type Type = (typeof errorKeys)[number] | "all";
const errorKeys = Object.keys(ignore).sort((a, b) => a.length - b.length) as (keyof typeof ignore)[];

export default async function handleIgnore(args: string[]): Promise<CommandResponse> {
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

  if (number < 0) {
    const error = "The number of minutes must be positive.";
    await sendHTMLMessage(error);
    return { successful: false, error };
  }

  if ((type !== "all" && !errorKeys.includes(type)) || type.toLowerCase() === "codes") {
    const error = `Valid types:\n- <code>${["all", ...errorKeys].join("</code>\n- <code>")}</code>`;
    await sendHTMLMessage(error);
    return { successful: false, error };
  }

  for (const t of type === "all" ? errorKeys : [type]) {
    ignore[t].from = Date.now();
    ignore[t].minutes = number;
  }

  const response = `Ignoring ${type} for ${number} minutes.`;
  await sendMessage(response);
  return { successful: true, response };
}
