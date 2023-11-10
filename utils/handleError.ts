import { escapeHtml } from "escapeHtml";
import isError from "../types/guards/isError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import isMongoServerError from "../types/guards/isMongoServerError.ts";

const maxLength = 4096 - "<code></code>".length - 10;

// deno-lint-ignore no-explicit-any
export default async function handleError(e: any) {
  console.error("#".repeat(40));
  console.error(e);
  for (const key of Object.getOwnPropertyNames(e)) console.error(key + ":", e[key]);

  // These are "Wont fix" issues
  if ("response" in e && e.response.status === 502) return;
  if (isError(e)) {
    if (e.message.startsWith("error sending request for url")) return;
    if (e.message.includes("Resource temporarily unavailable")) Deno.exit(1); // exit with error so that PM2 restarts the process
    if (e.message.includes("Error when retrieving balance: cannot check spent coins")) return;
    if (e.message.startsWith("Error: No such object: inc_mainnet_")) return;
  }
  if (isMongoServerError(e) && e.codeName === "NotPrimaryNoSecondaryOk") Deno.exit(1); // exit with error so that PM2 restarts the process

  const sendError = (message: string) =>
    sendMessage(`<code>${escapeHtml(message).slice(0, maxLength)}</code>`, undefined, { parse_mode: "HTML" });

  try {
    if ("message" in e) {
      await sendError(typeof e.message === "object" ? JSON.stringify(e.message) : e.message);
    } else {
      await sendError(JSON.stringify(e));
    }
  } catch (e) {
    console.error(e);
    await sendMessage("Error al enviar mensaje de Telegram.").catch(console.error);
  }
}
