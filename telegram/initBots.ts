import "std/dotenv/load.ts";
import { Bot } from "grammy/mod.ts";
import submitCommand from "./submitCommand.ts";
import { ADMIN_ID, BOT_TOKEN, NOTIFICATIONS_BOT_TOKEN } from "../env.ts";

const bot = new Bot(BOT_TOKEN);

export default bot;

bot.on("message", (ctx) => {
  if (ctx.message.text && ctx?.chat?.id === ADMIN_ID) submitCommand(ctx.message.text);
});

bot.catch(console.error);

bot.start();

// Initialize the notifications bot
export const notificationsBot = new Bot(NOTIFICATIONS_BOT_TOKEN);

notificationsBot.on("message", (ctx) => void ctx.reply(`<code>${ctx.chat?.id}</code>`, { parse_mode: "HTML" }));

notificationsBot.catch(console.error);

notificationsBot.start();
