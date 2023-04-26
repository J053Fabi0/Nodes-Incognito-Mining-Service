import bot from "../initBot.ts";
import { ignore } from "../../utils/variables.ts";
import validateItems from "../../utils/validateItems.ts";
import isBeingIgnored from "../../utils/isBeingIgnored.ts";
import { ShardsNames } from "duplicatedFilesCleanerIncognito";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import { docker, dockerPs } from "duplicatedFilesCleanerIncognito";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";

export default async function handleCopyOrMove(
  args: string[],
  action: "copy" | "move",
  options: Parameters<typeof bot.api.sendMessage>[2] = {}
) {
  const [nodesRaw, rawShards] = [args.slice(0, 2), args.slice(2)];

  // Validate and get the nodes indexes
  const [fromNodeIndex = null, toNodeIndex = null] = await validateItems({ rawItems: nodesRaw }).catch(() => []);
  if (fromNodeIndex === null || toNodeIndex === null) return false;

  // Validate and get the shards
  const shards =
    rawShards.length === 0
      ? // if no shards are specified, use the beacon
        ["beacon" as const]
      : // or validate the shards
        ((await validateItems({
          name: "shard",
          // transform shard names to the format beacon or shard[0-7]
          rawItems: rawShards.map((shard) => (/^(shard[0-7]|beacon)$/i.test(shard) ? shard : `shard${shard}`)),
          validItems: duplicatedFilesCleaner.usedShards as string[],
        }).catch(() => null)) as ShardsNames[] | null);
  if (!shards) return false;

  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  // Stop the dockers regardless of the ignore value if at least one of them is online
  const dockerStatus = await dockerPs([fromNodeIndex, toNodeIndex]);
  if (dockerStatus[fromNodeIndex].status === "ONLINE" || dockerStatus[toNodeIndex].status === "ONLINE")
    await Promise.all([
      sendMessage("Stopping nodes...", undefined, options),
      dockerStatus[toNodeIndex].status === "ONLINE" && docker(`inc_mainnet_${toNodeIndex}`, "stop"),
      dockerStatus[fromNodeIndex].status === "ONLINE" && docker(`inc_mainnet_${fromNodeIndex}`, "stop"),
    ]);

  for (const shard of shards)
    await Promise.all([
      sendHTMLMessage(
        `${
          action === "copy" ? "Copying" : "Moving"
        } ${shard} from node ${fromNodeIndex} to node ${toNodeIndex}...`,
        undefined,
        options
      ),
      action === "copy"
        ? duplicatedFilesCleaner.copyData({
            from: fromNodeIndex as unknown as string,
            to: toNodeIndex as unknown as string,
            shards: [shard],
          })
        : duplicatedFilesCleaner.move(fromNodeIndex, toNodeIndex, [shard]),
    ]);

  // restore the ignore value
  ignore.docker.minutes = lastIgnoreMinutes;

  // start the dockers if they were not being ignored
  if (
    isBeingIgnored("docker") &&
    (dockerStatus[fromNodeIndex].status === "ONLINE" || dockerStatus[toNodeIndex].status === "ONLINE")
  )
    await Promise.all([
      sendMessage("Starting nodes...", undefined, options),
      dockerStatus[toNodeIndex].status === "ONLINE" && docker(`inc_mainnet_${toNodeIndex}`, "start"),
      dockerStatus[fromNodeIndex].status === "ONLINE" && docker(`inc_mainnet_${fromNodeIndex}`, "start"),
    ]);

  return true;
}
