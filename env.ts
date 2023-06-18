import { loadSync } from "std/dotenv/mod.ts";

const env = loadSync({ examplePath: "./.example.env" });

export const BOT_TOKEN = env.BOT_TOKEN;
export const PORT = +env.PORT;
export const MONGO_URI = env.MONGO_URI;
export const ADMIN_ID = +env.ADMIN_ID;
export const NOTION_KEY = env.NOTION_KEY;
export const NOTION_DATABASE_ID = env.NOTION_DATABASE_ID;
