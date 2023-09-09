import { redis } from "../initDatabase.ts";
import { commands } from "./submitCommand.ts";
import handleError from "../utils/handleError.ts";
import EventedArray from "../utils/EventedArray.ts";
import { AllowedCommandsWithOptions } from "../utils/getCommandOrPossibilities.ts";

const redisKey = "commands";

export type CommandResponse = { response: string; successful: true } | { successful: false; error: string };
export interface CommandOptions {
  /** Send telegram messages silently */
  silent?: boolean;
  telegramMessages?: boolean;
}
export interface Command {
  /** Full command, with the first word always as an allowed command */
  command: AllowedCommandsWithOptions;
  options?: CommandOptions;
  resolve?: (response: CommandResponse) => void;
}
export type Commands = {
  /** The first one is the oldest */
  resolved: EventedArray<AllowedCommandsWithOptions>;
  /** The first one is the oldest */
  pending: EventedArray<Command>;
};

function isCommands(data: unknown): data is Commands {
  return typeof data === "object" && data !== null && "resolved" in data && "pending" in data;
}

export async function getCommandsFromReds(): Promise<void> {
  const commandsStr = await redis.get(redisKey);
  // if there are no pending nodes in redis, return null
  if (!commandsStr) return;

  try {
    const parsedCommands = JSON.parse(commandsStr) as Commands;

    if (!isCommands(parsedCommands)) return;

    for (const pending of parsedCommands.pending) commands.pending.push(pending);
    for (const resolved of parsedCommands.resolved) commands.resolved.push(resolved);
  } catch (e) {
    handleError(e);
  }
}
