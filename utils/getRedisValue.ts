import flags from "./flags.ts";
import { redis } from "../initDatabase.ts";

export const redisPrefix = "variable_";

export const variablesToSave: [string, unknown][] = [];

if (flags.reloadRedisVariables) await redis.del(`${redisPrefix}*`);

// deno-lint-ignore no-explicit-any
export type AcceptedRecord = Record<string, any>;

/**
 * Returns an object saved in redis, or the default value if it doesn't exist.
 * from redis when it's initialized
 * @param redisKey The key to get the value from redis
 * @param defaultValue The default value to return if the key doesn't exist in redis
 */
export default async function getRedisValue<T extends AcceptedRecord>(
  redisKey: string,
  defaultValue: T
): Promise<T> {
  const fullRedisKey = redisPrefix + redisKey;
  const redisData = await redis.get(fullRedisKey);
  const data: T = redisData ? JSON.parse(redisData) : defaultValue;

  variablesToSave.push([fullRedisKey, data]);

  return data;
}
