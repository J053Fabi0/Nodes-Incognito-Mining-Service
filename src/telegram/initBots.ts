import "std/dotenv/load.ts";
import { Bot } from "grammy/mod.ts";
import { BOT_TOKEN, NOTIFICATIONS_BOT_TOKEN } from "../../env.ts";

const bot = new Bot(BOT_TOKEN);

export default bot;
export const notificationsBot = new Bot(NOTIFICATIONS_BOT_TOKEN);

notificationsBot.on("message", (ctx) => void ctx.reply(`<code>${ctx.chat?.id}</code>`, { parse_mode: "HTML" }));

// Initialize the botOnEvents
import("./botOnEvents.ts");

bot.start();
notificationsBot.start();
