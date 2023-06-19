import { ADMIN_ID } from "../env.ts";
import bot, { notificationsBot } from "./initBots.ts";

const sendMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Parameters<typeof bot.api.sendMessage>[2] = {},
  botInstance: "bot" | "notificationsBot" = "bot"
) => (botInstance === "bot" ? bot : notificationsBot).api.sendMessage(chatID, message, options);
export default sendMessage;

export const sendHTMLMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Omit<Parameters<typeof bot.api.sendMessage>[2], "parse_mode"> = {},
  botInstance: "bot" | "notificationsBot" = "bot"
) =>
  (botInstance === "bot" ? bot : notificationsBot).api.sendMessage(chatID, message, {
    ...options,
    parse_mode: "HTML",
  });
