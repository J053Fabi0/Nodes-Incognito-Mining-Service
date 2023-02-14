import { escapeHtml } from "escapeHtml";
import sendMessage from "../telegram/sendMessage.ts";

// deno-lint-ignore no-explicit-any
export default async function handleError(e: any) {
  console.error("#".repeat(40));
  for (const key of Object.getOwnPropertyNames(e)) console.error(key, e[key]);

  const sMessage = (message: string) =>
    sendMessage(`<code>${escapeHtml(message)}</code>`, undefined, { parse_mode: "HTML" });

  try {
    if ("message" in e) {
      await sMessage(typeof e.message === "object" ? JSON.stringify(e.message) : e.message);
    } else {
      await sMessage(JSON.stringify(e));
    }
  } catch (e) {
    console.error(e);
    await sendMessage("Error al enviar mensaje de Telegram.");
  }
}
