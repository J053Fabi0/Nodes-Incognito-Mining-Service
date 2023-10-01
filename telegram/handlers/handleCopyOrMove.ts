import axiod from "axiod";
import sendMessage from "../sendMessage.ts";
import isError from "../../types/guards/isError.ts";
import ignoreError from "../../utils/ignoreError.ts";
import validateItems from "../../utils/validateItems.ts";
import { getNodeServer } from "../../controllers/node.controller.ts";
import { CommandOptions, CommandResponse } from "../submitCommandUtils.ts";
import { IgnoreData, ignore, monitorInfoByDockerIndex } from "../../utils/variables.ts";
import { ShardsNames, shardsNames } from "../../duplicatedFilesCleaner/types/shards.type.ts";

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

  const [from = null, to = null] = nodesOrError;
  if (from === null) return { successful: false, error: "Missing 1st argument: from node index." };
  if (to === null) return { successful: false, error: "Missing 2nd argument: to node index." };

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

  // check the servers of the nodes
  const fromServer = await getNodeServer({ dockerIndex: +from });
  if (!fromServer) return { successful: false, error: `Node ${from} doesn't have a server.` };
  const toServer = await getNodeServer({ dockerIndex: +to });
  if (!toServer) return { successful: false, error: `Node ${to} doesn't have a server.` };
  if (fromServer.url !== toServer.url) return { successful: false, error: "Nodes are not on the same server." };

  // change the cache
  const fromNodeIndexData = monitorInfoByDockerIndex[from];
  const toNodeIndexData = monitorInfoByDockerIndex[to];
  for (const shard of shards) {
    if (toNodeIndexData) toNodeIndexData.nodeInfo[shard] = fromNodeIndexData?.nodeInfo[shard];
    if (action === "move" && fromNodeIndexData) fromNodeIndexData.nodeInfo[shard] = 0;
  }

  // Save the current docker ignore value and set it to 40 to ignore dockers until the process is done
  const lastIgnoreInfo: IgnoreData | undefined = ignore.docker[from] ? { ...ignore.docker[from]! } : undefined;
  ignoreError("docker", +from, 40);

  try {
    await axiod.post(`${fromServer.url}/shards`, { action, from, to, shards });
  } finally {
    // restore the ignore value
    ignore.docker[from] = lastIgnoreInfo;
  }

  if (options?.telegramMessages) await sendMessage("Done.", undefined, { disable_notification: options?.silent });

  return {
    successful: true,
    response: `${shards.join(", ")} ${action}${action === "copy" ? "e" : ""}d from node ${from} to node ${to}.`,
  };
}
