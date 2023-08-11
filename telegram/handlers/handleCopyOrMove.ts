import sendMessage from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import validateItems from "../../utils/validateItems.ts";
import { docker, dockerPs } from "duplicatedFilesCleanerIncognito";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { ShardsNames, shardsNames } from "duplicatedFilesCleanerIncognito";
import { ignore, monitorInfoByDockerIndex } from "../../utils/variables.ts";

export default async function handleCopyOrMove(
  args: string[],
  action: "copy" | "move",
  options?: CommandOptions
): Promise<CommandResponse> {
  const [nodesRaw, rawShards] = [args.slice(0, 2), args.slice(2)];

  // Validate and get the nodes indexes
  const nodesOrError = await validateItems({ rawItems: nodesRaw }).catch((e) => {
    if (isError(e)) return e;
    throw e;
  });
  if (isError(nodesOrError)) return { successful: false, error: nodesOrError.message };

  const [fromNodeIndex = null, toNodeIndex = null] = nodesOrError;
  if (fromNodeIndex === null) return { successful: false, error: "Missing 1st argument: from node index." };
  if (toNodeIndex === null) return { successful: false, error: "Missing 2nd argument: to node index." };

  // Validate and get the shards
  const shards: ShardsNames[] | Error =
    rawShards.length === 0
      ? // if no shards are specified, use the beacon
        ["beacon" as const]
      : // or validate the shards
        ((await validateItems({
          name: "shard",
          // transform shard names to the format beacon or shard[0-7]
          rawItems: rawShards.map((shard) => (/^(shard[0-7]|beacon)$/i.test(shard) ? shard : `shard${shard}`)),
          validItems: [...shardsNames] as string[],
        }).catch((e) => {
          if (isError(e)) return e;
          throw e;
        })) as ShardsNames[] | Error);
  if (isError(shards)) return { successful: false, error: shards.message };

  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  const responses: string[] = [];

  // Stop the dockers regardless of the ignore value if at least one of them is online
  const dockerStatus = await dockerPs([fromNodeIndex, toNodeIndex]);
  if (dockerStatus[fromNodeIndex].running || dockerStatus[toNodeIndex].running) {
    await Promise.all([
      options?.telegramMessages
        ? sendMessage("Stopping nodes...", undefined, { disable_notification: options?.silent })
        : null,
      dockerStatus[toNodeIndex].running && docker(`inc_mainnet_${toNodeIndex}`, "stop"),
      dockerStatus[fromNodeIndex].running && docker(`inc_mainnet_${fromNodeIndex}`, "stop"),
    ]);
    responses.push("Stopping nodes...");
  }

  for (const shard of shards) {
    const response =
      `${action === "copy" ? "Copying" : "Moving"} ${shard} ` +
      `from node ${fromNodeIndex} to node ${toNodeIndex}...`;

    // change the cache
    const fromNodeIndexData = monitorInfoByDockerIndex[fromNodeIndex];
    const toNodeIndexData = monitorInfoByDockerIndex[toNodeIndex];
    if (toNodeIndexData) toNodeIndexData.nodeInfo[shard] = fromNodeIndexData?.nodeInfo[shard];
    if (action === "move" && fromNodeIndexData) fromNodeIndexData.nodeInfo[shard] = 0;

    await Promise.all([
      options?.telegramMessages
        ? sendMessage(response, undefined, { disable_notification: options?.silent })
        : null,
      action === "copy"
        ? duplicatedFilesCleaner.copyData({
            from: fromNodeIndex as unknown as string,
            to: toNodeIndex as unknown as string,
            shards: [shard],
          })
        : duplicatedFilesCleaner.move(fromNodeIndex, toNodeIndex, [shard]),
    ]);

    responses.push(response);
  }

  // restore the ignore value
  ignore.docker.minutes = lastIgnoreMinutes;

  // start the dockers if they were not being ignored
  if (dockerStatus[fromNodeIndex].running || dockerStatus[toNodeIndex].running) {
    await Promise.all([
      options?.telegramMessages &&
        sendMessage("Starting nodes...", undefined, { disable_notification: options?.silent }),
      dockerStatus[toNodeIndex].running && docker(`inc_mainnet_${toNodeIndex}`, "start"),
      dockerStatus[fromNodeIndex].running && docker(`inc_mainnet_${fromNodeIndex}`, "start"),
    ]);
    responses.push("Starting nodes...");
  }

  if (options?.telegramMessages) await sendMessage("Done.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: responses.join("\n") };
}
