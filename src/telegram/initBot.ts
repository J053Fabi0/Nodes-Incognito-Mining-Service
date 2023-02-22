import "dotenv";
import { Bot } from "grammy";

const bot = new Bot(Deno.env.get("BOT_TOKEN") as string);

export default bot;

// Initialize the botOnEvents
import("./botOnEvents.ts");

bot.start();
