import {
  ErrorTypes,
  AllErrorTypes,
  allErrorTypes,
  lastErrorTimes,
  GlobalErrorTypes,
  lastGlobalErrorTimes,
} from "../../utils/variables.ts";
import { escapeHtml } from "escapeHtml";
import constants from "../../constants.ts";
import { sendHTMLMessage } from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import { CommandResponse } from "../submitCommand.ts";
import objectToTableText from "../objectToTableText.ts";
import validateItems from "../../utils/validateItems.ts";
import getMinutesSinceError from "../../utils/getMinutesSinceError.ts";

type NodesByPublicKey = Record<string, { name: string; dockerIndex: number }>;

export default async function handleErrorsInfo(rawErrorCodes: string[]): Promise<CommandResponse> {
  const errorCodesToShow: readonly AllErrorTypes[] | Error =
    rawErrorCodes.length === 0
      ? allErrorTypes
      : ((await validateItems({
          name: "error code",
          rawItems: rawErrorCodes,
          validItems: allErrorTypes as unknown as string[],
        }).catch((e) => {
          if (isError(e)) return e;
          throw e;
        })) as AllErrorTypes[] | Error);
  if (isError(errorCodesToShow)) return { successful: false, error: errorCodesToShow.message };

  let text = "";

  for (const [error, date] of Object.entries(lastGlobalErrorTimes) as [GlobalErrorTypes, number][]) {
    if (!errorCodesToShow.includes(error)) continue;
    text += `<code>${error}</code><code>: </code><code>${getMinutesSinceError(date).toFixed(1)} min</code>\n`;
  }
  if (text) text += "\n";

  const nodesByPublicKey: NodesByPublicKey = Object.fromEntries(
    constants.map(({ validatorPublic, ...data }) => [validatorPublic, data])
  );

  for (const publicKey of Object.keys(lastErrorTimes)) {
    const errors = (Object.entries(lastErrorTimes[publicKey]) as [ErrorTypes, number][]).filter(([error]) =>
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

  const response = text.trim() || "No errors found. Send /full or /fulltext to get all the information.";
  await sendHTMLMessage(response);
  return { successful: true, response };
}
