import bot from "./initBot.ts";

const sendMessage = (
  message: string,
  chatID: string | number = "861616600",
  options: Parameters<typeof bot.api.sendMessage>[2] = {}
) => bot.api.sendMessage(chatID, message, options);

export default sendMessage;
