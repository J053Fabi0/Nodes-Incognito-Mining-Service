import { escapeHtml } from "escapeHtml";
import { AllErrorTypes } from "./variables.ts";
import sendMessage from "../telegram/sendMessage.ts";

export default async function handleNodeError(
  errorKey: AllErrorTypes,
  dockerIndex: number | undefined,
  minutesSinceError: number
) {
  console.error("#".repeat(40));
  console.error(dockerIndex, errorKey, `${Math.round(minutesSinceError)} minutes`);

  await sendMessage(
    (typeof dockerIndex === "number" ? `<code>${dockerIndex}</code> - ` : "") +
      `<code>${escapeHtml(errorKey)}</code><code>: ` +
      `${Math.round(minutesSinceError)} minutes</code>`,
    undefined,
    { parse_mode: "HTML" }
  ).catch(console.error);
}
