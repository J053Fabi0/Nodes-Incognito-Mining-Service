import "std/dotenv/load.ts";
import { Bot } from "grammy/mod.ts";
import botOnEvents from "./botOnEvents.ts";
import { BOT_TOKEN, NOTIFICATIONS_BOT_TOKEN } from "../env.ts";

const bot = new Bot(BOT_TOKEN);

export default bot;

// Initialize the botOnEvents
bot.on("message", (ctx) => void botOnEvents(ctx));

bot.start();

// Initialize the notifications bot
export const notificationsBot = new Bot(NOTIFICATIONS_BOT_TOKEN);

notificationsBot.on("message", (ctx) => void ctx.reply(`<code>${ctx.chat?.id}</code>`, { parse_mode: "HTML" }));

notificationsBot.start();
