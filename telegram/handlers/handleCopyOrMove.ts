import sendMessage from "../sendMessage.ts";
import setCache from "../../utils/setCache.ts";
import isError from "../../types/guards/isError.ts";
import ignoreError from "../../utils/ignoreError.ts";
import validateItems from "../../utils/validateItems.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { docker, dockerPs } from "../../duplicatedFilesCleaner/utils/commands.ts";
import { IgnoreData, ignore, monitorInfoByDockerIndex } from "../../utils/variables.ts";
import { ShardsNames, shardsNames } from "../../duplicatedFilesCleaner/types/shards.type.ts";

export default async function handleCopyOrMove(
  args: string[],
  action: "copy" | "move",
  options?: Pick<CommandOptions, "silent" | "telegramMessages">
): Promise<CommandResponse> {
  const [nodesRaw, rawShards] = [args.slice(0, 2), args.slice(2)];

  // Validate and get the nodes indexes
  const nodesOrError = await validateItems({ rawItems: nodesRaw }).catch((e) => {
    if (isError(e)) return e;
    throw new Error(e);
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
          throw new Error(e);
        })) as ShardsNames[] | Error);
  if (isError(shards)) return { successful: false, error: shards.message };

  // check if from is not empty
  const files = await duplicatedFilesCleaner.getFilesOfNodes({ nodes: [fromNodeIndex] });
  for (const shard of shards)
    if (files[shard][fromNodeIndex].length === 0)
      return { successful: false, error: `Node ${fromNodeIndex} doesn't have any files for ${shard}.` };

  // Save the current docker ignore value and set it to 40 to ignore dockers until the process is done
  const lastIgnoreInfo: IgnoreData | undefined = ignore.docker[fromNodeIndex]
    ? { ...(ignore.docker[fromNodeIndex] as IgnoreData) }
    : undefined;
  ignoreError("docker", +fromNodeIndex, 40);

  const responses: string[] = [];

  // Stop the dockers regardless of the ignore value if at least one of them is online
  const dockerStatus = await dockerPs([fromNodeIndex, toNodeIndex]);

  const fromRunning = dockerStatus[fromNodeIndex].running;
  const toRunning = dockerStatus[toNodeIndex].running;

  if (toRunning || fromRunning) {
    if (fromRunning) setCache(fromNodeIndex, "docker.running", false);
    if (toRunning) setCache(toNodeIndex, "docker.running", false);
    await Promise.all([
      options?.telegramMessages &&
        sendMessage("Stopping nodes...", undefined, { disable_notification: options?.silent }),
      toRunning && docker(`inc_mainnet_${toNodeIndex}`, "stop"),
      fromRunning && docker(`inc_mainnet_${fromNodeIndex}`, "stop"),
    ]);
    if (fromRunning) setCache(fromNodeIndex, "docker.running", false);
    if (toRunning) setCache(toNodeIndex, "docker.running", false);
    responses.push("Stopping nodes...");
  }

  for (const shard of shards) {
    const response =
      `${action === "copy" ? "Copying" : "Moving"} ${shard} ` +
      `from node ${fromNodeIndex} to node ${toNodeIndex}...`;

    // change the cache
    const changeCache = (() => {
      const fromNodeIndexData = monitorInfoByDockerIndex[fromNodeIndex];
      const toNodeIndexData = monitorInfoByDockerIndex[toNodeIndex];
      const fromShard = fromNodeIndexData?.nodeInfo[shard];
      return () => {
        if (toNodeIndexData) toNodeIndexData.nodeInfo[shard] = fromShard;
        if (action === "move" && fromNodeIndexData) fromNodeIndexData.nodeInfo[shard] = 0;
      };
    })();

    changeCache();
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
    changeCache();

    responses.push(response);
  }

  // restore the ignore value
  ignore.docker[fromNodeIndex] = lastIgnoreInfo;

  if (options?.telegramMessages) await sendMessage("Done.", undefined, { disable_notification: options?.silent });

  return { successful: true, response: responses.join("\n") };
}
