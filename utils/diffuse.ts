import { redis } from "../initDatabase.ts";

// const keys = await redis.keys("session_*");
// the opposite, all the keys that do not start with "session_"
async function getKeys() {
  return (await redis.keys("*")).filter((key) => !key.startsWith("session_"));
}

console.log(await getKeys());

await redis.set("test", "test");

console.log(await getKeys());

await redis.set("test", "test2");

console.log(await getKeys());
console.log(await redis.get("test"));
