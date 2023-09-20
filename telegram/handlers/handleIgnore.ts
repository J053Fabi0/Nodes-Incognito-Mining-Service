import { escapeHtml } from "escapeHtml";
import isError from "../../types/guards/isError.ts";
import ignoreError from "../../utils/ignoreError.ts";
import validateItems from "../../utils/validateItems.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import isGlobalErrorType from "../../types/guards/isGlobalErrorType.ts";
import { AllIgnoreTypes, allIgnoreTypes } from "../../utils/variables.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";

const errorKeys = ["all", ...allIgnoreTypes].toSorted((a, b) => a.length - b.length);
type Type = AllIgnoreTypes | "all";

function getType(type: string): Type | null {
  for (const t of [...errorKeys, "all"] as Type[]) if (type.toLowerCase() === t.toLowerCase()) return t;
  return null;
}

const ERROR = `Valid types:\n- <code>${errorKeys.join("</code>\n- <code>")}</code>`;
async function sendError(error: string, options?: CommandOptions): Promise<CommandResponse> {
  if (options?.telegramMessages)
    await sendHTMLMessage(error, undefined, { disable_notification: options?.silent });
  return { successful: false, error: ERROR };
}

export default async function handleIgnore(args: string[], options?: CommandOptions): Promise<CommandResponse> {
  const type = getType(args[0]);
  if (type === null) return sendError(ERROR, options);

  if (!errorKeys.map((a) => a.toLowerCase()).includes(type.toLowerCase()) || type.toLowerCase() === "codes")
    return sendError(ERROR, options);

  const minutes = Number(args[args.length - 1]);
  if (isNaN(minutes))
    return sendError(
      `The number of minutes must be a number, not <code>${escapeHtml(args[args.length - 1])}</code>.`,
      options
    );

  if (minutes < 0) {
    const error = "The number of minutes must be positive.";
    if (options?.telegramMessages) await sendMessage(error, undefined, { disable_notification: options?.silent });
    return { successful: false, error };
  }

  if (isGlobalErrorType(type) || (args.length === 2 && type === "all")) {
    if (args.length > 2)
      return sendError(
        "For global errors you don't need to specify the docker indexes or <code>all</code>.",
        options
      );
    ignoreError(type, minutes);
  } else {
    if (args.length <= 2)
      return sendError(
        "For non-global errors you need to specify the docker indexes or <code>all</code>.",
        options
      );

    const nodes =
      args.length === 3 && args[1] === "all"
        ? "all"
        : await validateItems({ rawItems: args.slice(1, -1) }).catch((e) => {
            if (isError(e)) return e;
            throw e;
          });
    if (isError(nodes)) return sendError(nodes.message, options);

    if (nodes === "all") ignoreError(type, "all", minutes);
    else for (const node of nodes) ignoreError(type, +node, minutes);
  }

  const response = `Ignoring ${args.join(" ")}`;
  if (options?.telegramMessages) await sendMessage(response, undefined, { disable_notification: options?.silent });
  return { successful: true, response };
}
