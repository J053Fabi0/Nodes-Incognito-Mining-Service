import "std/dotenv/load.ts";
import { Bot } from "grammy/mod.ts";
import submitCommand from "./submitCommand.ts";
import { ADMIN_ID, BOT_TOKEN, BUILDING, NOTIFICATIONS_BOT_TOKEN } from "../env.ts";

const bot = new Bot(BOT_TOKEN);

export default bot;

if (!BUILDING) {
  bot.on("message", (ctx) => {
    if (ctx.message.text && ctx?.chat?.id === ADMIN_ID)
      submitCommand(ctx.message.text, { telegramMessages: true });
  });

  bot.catch(console.error);

  bot.start();
}

// Initialize the notifications bot
export const notificationsBot = new Bot(NOTIFICATIONS_BOT_TOKEN);

if (!BUILDING) {
  notificationsBot.catch(console.error);

  notificationsBot.start();
}
