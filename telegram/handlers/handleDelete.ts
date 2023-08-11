import { join } from "std/path/mod.ts";
import sendMessage from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import validateItems from "../../utils/validateItems.ts";
import isBeingIgnored from "../../utils/isBeingIgnored.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { ignore, monitorInfoByDockerIndex } from "../../utils/variables.ts";
import { ShardsNames, dockerPs, docker, shardsNames } from "duplicatedFilesCleanerIncognito";

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
  const [fromNodeIndex] = nodeIndexOrError;

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

  const responses: string[] = [];

  // Stop the docker regardless of the ignore value if at least one of them is online
  const dockerStatus = await dockerPs([fromNodeIndex]);
  if (dockerStatus[fromNodeIndex].running) {
    await Promise.all([
      options?.telegramMessages
        ? sendMessage("Stopping node...", undefined, { disable_notification: options?.silent })
        : null,
      docker(`inc_mainnet_${fromNodeIndex}`, "stop"),
    ]);
    responses.push("Stopping node...");
  }

  for (const shard of shards) {
    responses.push(`Deleting ${shard} from node ${fromNodeIndex}...`);
    await Promise.all([
      options?.telegramMessages
        ? sendMessage(`Deleting ${shard} from node ${fromNodeIndex}...`, undefined, {
            disable_notification: options?.silent,
          })
        : null,
      Deno.remove(join(duplicatedFilesCleaner.homePath, `/node_data_${fromNodeIndex}/mainnet/block/${shard}`), {
        recursive: true,
      }).catch(() => {}),
    ]);

    // change the cache
    const fromNodeIndexData = monitorInfoByDockerIndex[fromNodeIndex];
    if (fromNodeIndexData) fromNodeIndexData.nodeInfo[shard] = 0;
  }

  // restore the ignore value
  ignore.docker.minutes = lastIgnoreMinutes;

  // start the docker if they were not being ignored
  if (isBeingIgnored("docker") && dockerStatus[fromNodeIndex].running) {
    await Promise.all([
      options?.telegramMessages
        ? sendMessage("Starting node...", undefined, { disable_notification: options?.silent })
        : null,
      docker(`inc_mainnet_${fromNodeIndex}`, "start"),
    ]);
    responses.push("Starting node...");
  }

  return { successful: true, response: responses.join("\n") };
}
