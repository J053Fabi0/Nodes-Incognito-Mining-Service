import { SERVER_ID } from "./env.ts";
import { getServerById } from "../controllers/server.controller.ts";

export const server = (await getServerById(SERVER_ID))!;
if (!server) throw new Error("Server not found.");
