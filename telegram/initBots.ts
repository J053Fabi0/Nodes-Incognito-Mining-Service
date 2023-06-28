import "std/dotenv/load.ts";
import { Bot } from "grammy/mod.ts";
import handleCommands from "./handleCommands.ts";
import { ADMIN_ID, BOT_TOKEN, NOTIFICATIONS_BOT_TOKEN } from "../env.ts";

const bot = new Bot(BOT_TOKEN);

export default bot;

bot.on("message", (ctx) => {
  if (ctx.message.text && ctx?.chat?.id === ADMIN_ID) handleCommands(ctx.message.text);
});

bot.start();

// Initialize the notifications bot
export const notificationsBot = new Bot(NOTIFICATIONS_BOT_TOKEN);

notificationsBot.on("message", (ctx) => void ctx.reply(`<code>${ctx.chat?.id}</code>`, { parse_mode: "HTML" }));

notificationsBot.start();
