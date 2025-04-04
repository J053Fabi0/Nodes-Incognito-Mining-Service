import {
  ErrorInfo,
  ErrorTypes,
  AllErrorTypes,
  allErrorTypes,
  lastErrorTimes,
  GlobalErrorTypes,
  lastGlobalErrorTimes,
} from "../../utils/variables.ts";
import { escapeHtml } from "escapeHtml";
import { sendHTMLMessage } from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { rangeMsToTimeDescription } from "../../utils/msToTimeDescription.ts";

export default async function handleErrorsInfo(
  rawErrorCodes: string[],
  options?: CommandOptions
): Promise<CommandResponse> {
  const errorCodesToShow: readonly AllErrorTypes[] | Error =
    rawErrorCodes.length === 0
      ? allErrorTypes
      : ((await validateItems({
          name: "error code",
          rawItems: rawErrorCodes,
          validItems: allErrorTypes as unknown as string[],
        }).catch((e) => {
          if (isError(e)) return e;
          throw new Error(e);
        })) as AllErrorTypes[] | Error);
  if (isError(errorCodesToShow)) return { successful: false, error: errorCodesToShow.message };

  let text = "";

  for (const [error, date] of Object.entries(lastGlobalErrorTimes) as [GlobalErrorTypes, ErrorInfo][]) {
    if (!errorCodesToShow.includes(error)) continue;
    text +=
      `<code>${error}</code><code>: </code>` +
      `<code>${rangeMsToTimeDescription(date.startedAt, Date.now(), { short: true, includeMs: true })}</code>\n`;
  }
  if (text) text += "\n";

  for (const dockerIndex of Object.keys(lastErrorTimes)) {
    const errors = (Object.entries(lastErrorTimes[dockerIndex]) as [ErrorTypes, ErrorInfo][]).filter(([error]) =>
      errorCodesToShow.includes(error)
    );
    if (!errors.length) continue;
    text +=
      `<code>${dockerIndex}</code>\n` +
      `<code>${escapeHtml(
        objectToTableText(
          Object.fromEntries(
            errors.map(([error, { startedAt }]) => [
              error,
              rangeMsToTimeDescription(startedAt, Date.now(), { short: true, includeMs: true }),
            ])
          )
        )
      )
        .split("\n")
        .map((a) =>
          a.replace(
            ...(() => {
              const match = a.match(/: +/);
              if (match) return [match[0], `</code><code>${match[0]}</code><code>`] as [string, string];
              else return ["", ""] as [string, string];
            })()
          )
        )
        .join("</code>\n<code>")}</code>` +
      "\n\n";
  }

  const response = text.trim() || "No errors found. Send /full or /fulltext to get all the information.";
  if (options?.telegramMessages)
    await sendHTMLMessage(response, undefined, { disable_notification: options?.silent });
  return { successful: true, response };
}
