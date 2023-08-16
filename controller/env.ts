import { loadSync } from "std/dotenv/mod.ts";

const env = loadSync({ examplePath: "./controller/.example.env", envPath: "./controller/.env" });

export const PORT = +env.PORT;
export const API_KEY = env.API_KEY;
