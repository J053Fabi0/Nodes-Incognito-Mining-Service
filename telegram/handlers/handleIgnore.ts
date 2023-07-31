import { ignore } from "../../utils/variables.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

const errorKeys = Object.keys(ignore).sort((a, b) => a.length - b.length) as (keyof typeof ignore)[];
type Type = (typeof errorKeys)[number] | "all";

function getType(type: string): Type | null {
  for (const t of [...errorKeys, "all"] as Type[]) if (type.toLowerCase() === t.toLowerCase()) return t;
  return null;
}

async function sendError(options?: CommandOptions): Promise<CommandResponse> {
  const error = `Valid types:\n- <code>${["all", ...errorKeys].join("</code>\n- <code>")}</code>`;
  if (options?.telegramMessages)
    await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
  return { successful: false, error };
}

export default async function handleIgnore(args: string[], options?: CommandOptions): Promise<CommandResponse> {
  let number = 0; // default value is 0, to disable the ignore
  let type: Type | null = "docker";

  if (args.length === 1) {
    // the first argument could be the type if it's not a number
    if (isNaN(Number(args[0]))) type = args[0] as Type;
    // if it is a number, it's the number of minutes to ignore the de default type docker
    else number = Number(args[0]) || number;
  } else if (args.length > 1) {
    type = args[0] as Type;
    number = Number(args[1]) || number;
  }

  type = getType(type);
  if (type === null) return sendError(options);

  if (number < 0) {
    const error = "The number of minutes must be positive.";
    if (options?.telegramMessages) await sendMessage(error, undefined, { disable_notification: options?.silent });
    return { successful: false, error };
  }

  if (
    (type.toLowerCase() !== "all" && !errorKeys.map((a) => a.toLowerCase()).includes(type.toLowerCase())) ||
    type.toLowerCase() === "codes"
  )
    return sendError(options);

  for (const t of type === "all" ? errorKeys : [type]) {
    ignore[t].from = Date.now();
    ignore[t].minutes = number;
  }

  const response = `Ignoring ${type} for ${number} minutes.`;
  if (options?.telegramMessages) await sendMessage(response, undefined, { disable_notification: options?.silent });
  return { successful: true, response };
}
