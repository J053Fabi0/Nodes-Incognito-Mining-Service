import bot from "./initBot.ts";
import { ADMIN_ID } from "../../env.ts";

const sendMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Parameters<typeof bot.api.sendMessage>[2] = {}
) => bot.api.sendMessage(chatID, message, options);

export default sendMessage;

export const sendHTMLMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Omit<Parameters<typeof bot.api.sendMessage>[2], "parse_mode"> = {}
) => bot.api.sendMessage(chatID, message, { ...options, parse_mode: "HTML" });
