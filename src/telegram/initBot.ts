import "dotenv";
import { Bot } from "telegram/mod.ts";

const bot = new Bot(Deno.env.get("BOT_TOKEN") as string);

await bot.launch();

export default bot;

// Initialize the botOnEvents
import("./botOnEvents.ts");
