import "dotenv";
import { Bot } from "grammy/mod.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN") as string);

export default bot;

// Initialize the botOnEvents
import("./botOnEvents.ts");

bot.start();
