import { loadSync } from "std/dotenv/mod.ts";

const env = loadSync({ examplePath: "./.example.env" });

export const BOT_TOKEN = env.BOT_TOKEN;
export const API_KEY = env.API_KEY;
export const NOTIFICATIONS_BOT_TOKEN = env.NOTIFICATIONS_BOT_TOKEN;
export const NOTIFICATIONS_BOT_USERNAME = env.NOTIFICATIONS_BOT_USERNAME;
export const PORT = +env.PORT;
export const MONGO_URI = env.MONGO_URI;
export const ADMIN_ID = +env.ADMIN_ID;
/** With https and without traising slash */
export const WEBSITE_URL = env.WEBSITE_URL;
export const IS_PRODUCTION = Boolean(Deno.env.get("DENO_DEPLOYMENT_ID"));
export const REDIS_HOSTNAME = env.REDIS_HOSTNAME;
export const REDIS_PORT = +env.REDIS_PORT;
export const BUILDING = Boolean(Deno.env.get("BUILDING"));
