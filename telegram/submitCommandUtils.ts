import { redis } from "../initDatabase.ts";
import { commands } from "./submitCommand.ts";
import handleError from "../utils/handleError.ts";
import EventedArray from "../utils/EventedArray.ts";

const redisKey = "commands";

export type CommandResponse = { response: string; successful: true } | { successful: false; error: string };
export interface CommandOptions {
  /** Send telegram messages silently */
  silent?: boolean;
}
export interface Command {
  command: string;
  options?: CommandOptions;
  resolve?: (response: CommandResponse) => void;
}
export type Commands = {
  /** The first one is the oldest */
  resolved: EventedArray<string>;
  /** The first one is the oldest */
  pending: EventedArray<Command>;
};

function isCommands(data: unknown): data is Commands {
  return typeof data === "object" && data !== null && "resolved" in data && "pending" in data;
}

/** Pending nodes */
export async function saveToRedis() {
  await redis.set(redisKey, JSON.stringify(commands));
}

export function addSaveToRedisProxy<T extends Command>(obj: T): T {
  return new Proxy(obj, {
    set(target, name, value) {
      saveToRedis();
      return Reflect.set(target, name, value);
    },
  });
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
