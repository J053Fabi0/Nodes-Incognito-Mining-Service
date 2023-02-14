import { escapeHtml } from "escapeHtml";
import { ErrorTypes } from "./variables.ts";
import sendMessage from "../telegram/sendMessage.ts";

export default async function handleNodeError(errorKey: ErrorTypes, node: string, minutesSinceError: number) {
  console.error("#".repeat(40));
  console.error(node, errorKey, `${Math.round(minutesSinceError)} minutes`);

  try {
    await sendMessage(
      `<code>${node} - ${escapeHtml(errorKey)}: ${Math.round(minutesSinceError)} minutes</code>`,
      undefined,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    console.error(e);
  }
}
