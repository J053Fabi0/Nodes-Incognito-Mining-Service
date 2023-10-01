import { sleep } from "sleep";
import { redis } from "../initDatabase.ts";
import { variablesToSave } from "../utils/getRedisValue.ts";
import { lastGlobalErrorTimes } from "../utils/variables.ts";
import setOrRemoveErrorTime from "../utils/setOrRemoveErrorTime.ts";
import maxPromises from "../duplicatedFilesCleaner/utils/maxPromises.ts";

globalThis.addEventListener("unload", async () => {
  await saveVariablesToRedis();
  console.log("Saved variables to redis");
});

/** In seconds */
const TIMEOUT = 1;

export default async function saveVariablesToRedis() {
  let finished = false;

  await Promise.race([
    maxPromises(
      variablesToSave.map(([key, value]) => async () => {
        return await redis.set(key, JSON.stringify(value));
      }),
      3
    ).then(() => (finished = true)),
    sleep(TIMEOUT),
  ]);

  setOrRemoveErrorTime(!finished, lastGlobalErrorTimes, "redisTimeout");
}
