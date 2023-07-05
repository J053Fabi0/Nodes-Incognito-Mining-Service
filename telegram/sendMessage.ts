import { ADMIN_ID } from "../env.ts";
import bot, { notificationsBot } from "./initBots.ts";
import isGrammyError from "../types/guards/isGrammyError.ts";
import isStringOrNumber from "../types/guards/isStringOrNumber.ts";
import { changeClient, getClient } from "../controllers/client.controller.ts";

type Options = Parameters<typeof bot.api.sendMessage>[2];

const sendMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Options = {},
  botInstance: "bot" | "notificationsBot" = "bot"
) =>
  (botInstance === "bot" ? bot : notificationsBot).api
    .sendMessage(chatID, message, options)
    .catch(handleSendMessageError);
export default sendMessage;

export const sendHTMLMessage = (
  message: string,
  chatID: string | number = ADMIN_ID,
  options: Omit<Exclude<Options, undefined>, "parse_mode"> = {},
  botInstance: "bot" | "notificationsBot" = "bot"
) =>
  (botInstance === "bot" ? bot : notificationsBot).api
    .sendMessage(chatID, message, {
      ...options,
      parse_mode: "HTML",
    })
    .catch(handleSendMessageError);

export enum BotBlocked {
  /** When the user blocked the bot, but it was handled */
  HANDLED = "handled",
  /** When the user blocked the bot, but it was not handled */
  NOT_HANDLED = "not handled",
}

const errors = ["Forbidden: bot was blocked by the user", "Bad Request: chat not found"];

async function handleSendMessageError(e: unknown) {
  if (!isGrammyError(e)) throw e;
  if (!errors.includes(e.description)) throw e;
  if (!("chat_id" in e.payload)) throw e;

  const chat_id = e.payload.chat_id;
  if (!isStringOrNumber(chat_id)) throw e;

  const client = await getClient({ telegram: `${chat_id}` });
  if (!client) return BotBlocked.NOT_HANDLED;

  await changeClient({ _id: client._id }, { $set: { isBotBlocked: true } });

  console.error(`Client ${client.name} (${client._id}) blocked the bot`);

  return BotBlocked.HANDLED;
}
