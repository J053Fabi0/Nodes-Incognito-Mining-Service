import flags from "./flags.ts";
import { redis } from "../initDatabase.ts";

const redisPrefix = "variable_";

if (flags.reloadRedisVariables) await redis.del(redisPrefix + "*");

// deno-lint-ignore no-explicit-any
export type AcceptedRecord = Record<string, any>;

function isRecord<T extends AcceptedRecord>(data: AcceptedRecord): data is T {
  return typeof data === "object" && data !== null;
}

const DEPTH_LIMIT = 10;

function setProxy<T extends AcceptedRecord>(data: T, redisKey: string, rootData: AcceptedRecord, depth = 1): T {
  if (depth > DEPTH_LIMIT) return data;

  const keys = Object.keys(data) as (keyof T)[];
  for (const key of keys) {
    const value = data[key];
    if (isRecord(value)) data[key] = setProxy(value, redisKey, rootData, depth + 1);
  }

  return new Proxy<T>(data, {
    set: (target, key, value) => {
      const a = Reflect.set(target, key, value);
      if (typeof key === "string" && isRecord(value))
        Object.defineProperty(target, key, { value: setProxy(value, redisKey, rootData, depth + 1) });
      setTimeout(() => redis.set(redisPrefix + redisKey, JSON.stringify(rootData)), 0);
      return a;
    },
    deleteProperty: (target, key) => {
      setTimeout(() => redis.set(redisPrefix + redisKey, JSON.stringify(rootData)), 0);
      return Reflect.deleteProperty(target, key);
    },
  });
}

/**
 * Returns an object with a proxy that saves the data to redis when it's changed and fetches the data
 * from redis when it's initialized
 * @param redisKey The key to get the value from redis
 * @param defaultValue The default value to return if the key doesn't exist in redis
 */
export default async function getProxyAndRedisValue<T extends AcceptedRecord>(
  redisKey: string,
  defaultValue: T
): Promise<T> {
  const redisData = await redis.get(redisPrefix + redisKey);
  const data: T = redisData ? JSON.parse(redisData) : defaultValue;

  return setProxy(data, redisKey, data);
}
