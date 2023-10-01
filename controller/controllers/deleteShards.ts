import { Context } from "cheetah";
import { join } from "std/path/mod.ts";
import { IS_PRODUCTION } from "../../env.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { docker, dockerPs } from "../../duplicatedFilesCleaner/utils/commands.ts";
import normalizeShards from "../../duplicatedFilesCleaner/utils/normalizeShards.ts";
import { ShardsNames, ShardsStr } from "../../duplicatedFilesCleaner/types/shards.type.ts";

interface DeleteShardsBody {
  node: number;
  shards: (ShardsNames | ShardsStr)[];
}
export default async function deleteShards(c: Context) {
  const { node, shards } = (await c.req.json()) as DeleteShardsBody;

  // check if the node and shards are valid
  if (!duplicatedFilesCleaner.dockerIndexes.includes(node))
    throw c.exception("Bad Request", "Invalid node index.");
  const normalizedShards = (() => {
    try {
      return normalizeShards(shards);
    } catch (e) {
      throw c.exception("Bad Request", e.message);
    }
  })();

  // Stop the docker regardless of the ignore value if at least one of them is online
  const nodeRunning = IS_PRODUCTION ? (await dockerPs([node]))[node].running : false;
  if (nodeRunning) await docker(`inc_mainnet_${node}`, "stop");

  if (IS_PRODUCTION)
    for (const shard of normalizedShards)
      await Deno.remove(join(duplicatedFilesCleaner.homePath, `/node_data_${node}/mainnet/block/${shard}`), {
        recursive: true,
      }).catch(() => {});
}
