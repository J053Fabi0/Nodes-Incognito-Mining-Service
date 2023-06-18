import constants from "../../../constants.ts";
import { sendHTMLMessage } from "../sendMessage.ts";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import {
  AllErrorTypes,
  ErrorTypes,
  GlobalErrorTypes,
  allErrorTypes,
  lastErrorTimes,
  lastGlobalErrorTimes,
} from "../../utils/variables.ts";
import { escapeHtml } from "https://deno.land/x/escape_html@1.0.0/mod.ts";
import getMinutesSinceError from "../../utils/getMinutesSinceError.ts";

const nodesByPublicKey = Object.fromEntries(
  constants.map(({ validatorPublic, ...data }) => [validatorPublic, data])
);

export default async function handleErrorsInfo(rawErrorCodes: string[]) {
  const errorCodesToShow =
    rawErrorCodes.length === 0
      ? allErrorTypes
      : ((await validateItems({
          name: "error code",
          rawItems: rawErrorCodes,
          validItems: allErrorTypes as unknown as string[],
        }).catch(() => null)) as AllErrorTypes[] | null);
  if (!errorCodesToShow) return;

  let text = "";

  for (const [error, date] of Object.entries(lastGlobalErrorTimes) as [GlobalErrorTypes, Date][]) {
    if (!errorCodesToShow.includes(error)) continue;
    text += `<code>${error}</code><code>: </code><code>${getMinutesSinceError(date).toFixed(1)} min</code>\n`;
  }
  if (text) text += "\n";

  for (const publicKey of Object.keys(lastErrorTimes)) {
    const errors = (Object.entries(lastErrorTimes[publicKey]) as [ErrorTypes, Date][]).filter(([error]) =>
      errorCodesToShow.includes(error)
    );
    if (!errors.length) continue;
    const { dockerIndex, name } = nodesByPublicKey[publicKey];
    text +=
      `<code>${name} - #${dockerIndex}</code>\n` +
      `<code>${escapeHtml(
        objectToTableText(
          Object.fromEntries(
            errors.map(([error, date]) => [error, `${getMinutesSinceError(date).toFixed(1)} min`])
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
      "\n";
  }

  await sendHTMLMessage(text.trim() || "No errors found. Send /full or /fulltext to get all the information.");
}
