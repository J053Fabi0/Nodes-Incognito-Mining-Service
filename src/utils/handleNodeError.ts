import { escapeHtml } from "escapeHtml";
import { ErrorTypes } from "./variables.ts";
import sendMessage from "../telegram/sendMessage.ts";

export default async function handleNodeError(
  errorKey: ErrorTypes,
  node: string | undefined,
  minutesSinceError: number
) {
  console.error("#".repeat(40));
  console.error(node, errorKey, `${Math.round(minutesSinceError)} minutes`);

  await sendMessage(
    (node ? `<b>${node}</b> - ` : "") +
      `<code>${escapeHtml(errorKey)}</code><code>: ` +
      `${Math.round(minutesSinceError)} minutes</code>`,
    undefined,
    { parse_mode: "HTML" }
  ).catch(console.error);
}
