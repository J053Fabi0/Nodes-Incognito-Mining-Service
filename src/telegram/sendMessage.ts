import bot from "./initBot.ts";
import { SendMessageParameters } from "telegram/types.ts";

const sendMessage = (
  message: string,
  chatID: string | number = "861616600",
  options: Omit<SendMessageParameters, "chat_id" | "text"> = {}
) => bot.telegram.sendMessage({ chat_id: chatID, text: message, ...options });

export default sendMessage;
