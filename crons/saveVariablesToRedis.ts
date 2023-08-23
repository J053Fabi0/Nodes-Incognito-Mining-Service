import { redis } from "../initDatabase.ts";
import { variablesToSave } from "../utils/getRedisValue.ts";

globalThis.addEventListener("unload", async () => {
  await saveVariablesToRedis();
  console.log("Saved variables to redis");
});

export default async function saveVariablesToRedis() {
  await Promise.all(variablesToSave.map(([key, value]) => redis.set(key, JSON.stringify(value))));
}
