import axiod from "axiod";
import sendMessage from "../sendMessage.ts";
import setCache from "../../utils/setCache.ts";
import isError from "../../types/guards/isError.ts";
import validateItems from "../../utils/validateItems.ts";
import { getNodeServer } from "../../controllers/node.controller.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { ShardsNames, shardsNames } from "duplicatedFilesCleanerIncognito";
import { ignore, monitorInfoByDockerIndex } from "../../utils/variables.ts";

export default async function handleDelete(args: string[], options?: CommandOptions): Promise<CommandResponse> {
  const [nodeRaw, rawShards] = [args.slice(0, 1), args.slice(1)];

  if (nodeRaw.length === 0) {
    if (options?.telegramMessages)
      await sendMessage("Please specify a node.", undefined, { disable_notification: options?.silent });
    return { successful: false, error: "Missing 1st argument: node index." };
  }
  if (rawShards.length === 0) {
    if (options?.telegramMessages)
      await sendMessage("Please specify a shard.", undefined, { disable_notification: options?.silent });
    return { successful: false, error: "Missing 2nd argument: shard." };
  }

  // Validate and get the nodes indexes
  const nodeIndexOrError = await validateItems({ rawItems: nodeRaw }).catch((e) => {
    if (isError(e)) return e;
    throw e;
  });
  if (isError(nodeIndexOrError)) return { successful: false, error: nodeIndexOrError.message };
  const [dockerIndex] = nodeIndexOrError;

  // Validate and get the shards
  const shards: ShardsNames[] | Error =
    rawShards.length === 0
      ? // if no shards are specified, use the beacon
        ["beacon" as const]
      : // or validate the shards
        ((await validateItems({
          name: "shard",
          validItems: [...shardsNames] as string[],
          // transform shard names to the format beacon or shard[0-7]
          rawItems: rawShards.map((shard) => (/^(shard[0-7]|beacon)$/i.test(shard) ? shard : `shard${shard}`)),
        }).catch((e) => {
          if (isError(e)) return e;
          throw e;
        })) as ShardsNames[] | Error);
  if (isError(shards)) return { successful: false, error: shards.message };

  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  const server = await getNodeServer({ dockerIndex: +dockerIndex });
  if (!server) return { successful: false, error: `Node ${dockerIndex} doesn't have a server.` };

  // change the cache
  setCache(dockerIndex, "docker.running", false);
  const fromNodeIndexData = monitorInfoByDockerIndex[dockerIndex];
  if (fromNodeIndexData) for (const shard of shards) fromNodeIndexData.nodeInfo[shard] = 0;

  await axiod.delete(`${server.url}/shards`, { node: dockerIndex, shards });

  // restore the ignore value
  ignore.docker.minutes = lastIgnoreMinutes;

  return { successful: true, response: `${shards.join(", ")} deleted for node ${dockerIndex}.` };
}
