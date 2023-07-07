import { redis } from "../initDatabase.ts";

export default async function deleteEmptySessions() {
  const keys = await redis.keys("session_*");
  for (const key of keys) {
    const sessionStr = await redis.get(key);
    // delete those keys that are empty
    if (!sessionStr || sessionStr === '{"data":{},"_flash":{}}') await redis.del(key);
  }
}
