import { join } from "join";
import sendMessage from "../sendMessage.ts";
import { ignore } from "../../utils/variables.ts";
import validateItems from "../../utils/validateItems.ts";
import isBeingIgnored from "../../utils/isBeingIgnored.ts";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";
import { ShardsNames, dockerPs, docker } from "duplicatedFilesCleanerIncognito";

export default async function handleDelete(args: string[]) {
  const [nodeRaw, rawShards] = [args.slice(0, 1), args.slice(1)];

  // Validate and get the nodes indexes
  const [fromNodeIndex = null] = await validateItems({ rawItems: nodeRaw }).catch(() => []);
  if (fromNodeIndex === null) return false;

  // Validate and get the shards
  const shards =
    rawShards.length === 0
      ? // if no shards are specified, use the beacon
        ["beacon" as const]
      : // or validate the shards
        ((await validateItems({
          name: "shard",
          validItems: duplicatedFilesCleaner.usedShards as string[],
          // transform shard names to the format beacon or shard[0-7]
          rawItems: rawShards.map((shard) => (/^(shard[0-7]|beacon)$/i.test(shard) ? shard : `shard${shard}`)),
        }).catch(() => null)) as ShardsNames[] | null);
  if (!shards) return false;

  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  // Stop the docker regardless of the ignore value if at least one of them is online
  const dockerStatus = await dockerPs([fromNodeIndex]);
  if (dockerStatus[fromNodeIndex].status === "ONLINE")
    await Promise.all([sendMessage("Stopping node..."), docker(`inc_mainnet_${fromNodeIndex}`, "stop")]);

  for (const shard of shards)
    await Promise.all([
      sendMessage(`Deleting ${shard} from node ${fromNodeIndex}...`),
      Deno.remove(join(duplicatedFilesCleaner.homePath, `/node_data_${fromNodeIndex}/mainnet/block/${shard}`), {
        recursive: true,
      }).catch(() => {}),
    ]);

  // restore the ignore value
  ignore.docker.minutes = lastIgnoreMinutes;

  // start the docker if they were not being ignored
  if (isBeingIgnored("docker") && dockerStatus[fromNodeIndex].status === "ONLINE")
    await Promise.all([sendMessage("Starting node..."), await docker(`inc_mainnet_${fromNodeIndex}`, "start")]);

  return true;
}
