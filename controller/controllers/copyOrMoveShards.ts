import { Context } from "cheetah";
import { IS_PRODUCTION } from "../../env.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { docker, dockerPs } from "../../duplicatedFilesCleaner/utils/commands.ts";
import normalizeShards from "../../duplicatedFilesCleaner/utils/normalizeShards.ts";
import { ShardsNames, ShardsStr } from "../../duplicatedFilesCleaner/types/shards.type.ts";

interface copyOrMoveShardsBody {
  action: "copy" | "move";
  from: number;
  to: number;
  shards: (ShardsNames | ShardsStr)[];
}

export default async function copyOrMoveShards(c: Context) {
  const { action, from, to, shards } = (await c.req.json()) as copyOrMoveShardsBody;

  // check the data
  if (action !== "copy" && action !== "move") throw c.exception("Bad Request", "Invalid action.");
  if (from === to) throw c.exception("Bad Request", "From and to nodes must be different.");
  if (!duplicatedFilesCleaner.dockerIndexes.includes(from)) throw c.exception("Bad Request", "Invalid from node.");
  if (!duplicatedFilesCleaner.dockerIndexes.includes(to)) throw c.exception("Bad Request", "Invalid to node.");
  const normalizedShards = (() => {
    try {
      return normalizeShards(shards);
    } catch (e) {
      throw c.exception("Bad Request", e.message);
    }
  })();

  if (!IS_PRODUCTION) return;

  // check if from is not empty
  const files = duplicatedFilesCleaner.getFilesOfNodes({ nodes: [from] });
  for (const shard of normalizedShards)
    if (files[shard][from].length === 0)
      throw c.exception("Expectation Failed", `Node ${from} doesn't have any files for ${shard}.`);

  // Stop the docker regardless of the ignore value if at least one of them is online
  const dockersInfo = await dockerPs([from, to]);
  if (dockersInfo[to].running) await docker(`inc_mainnet_${to}`, "stop");
  if (dockersInfo[from].running) await docker(`inc_mainnet_${from}`, "stop");

  for (const shard of normalizedShards)
    await (action === "copy"
      ? duplicatedFilesCleaner.copyData({ from, to, shards: [shard] })
      : duplicatedFilesCleaner.move(from, to, [shard]));
}
