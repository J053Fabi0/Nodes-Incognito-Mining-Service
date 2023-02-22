import bot from "./initBot.ts";

const sendMessage = (
  message: string,
  chatID: string | number = "861616600",
  options: typeof bot.api.sendMessage.arguments[2] = {}
) => bot.api.sendMessage(chatID, message, options);

export default sendMessage;
