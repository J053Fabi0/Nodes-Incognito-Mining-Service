import { redis } from "../initDatabase.ts";
import { variablesToSave } from "../utils/getRedisValue.ts";
import { maxPromises } from "duplicatedFilesCleanerIncognito";

globalThis.addEventListener("unload", async () => {
  await saveVariablesToRedis();
  console.log("Saved variables to redis");
});

export default async function saveVariablesToRedis() {
  await maxPromises(
    variablesToSave.map(
      ([key, value]) =>
        () =>
          redis.set(key, JSON.stringify(value))
    ),
    3
  );
}
