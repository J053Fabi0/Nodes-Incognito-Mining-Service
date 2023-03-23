import validateItems from "../../utils/validateItems.ts";
import { ShardsNames } from "duplicatedFilesCleanerIncognito";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";

export async function getFromToAndShards(args: string[]) {
  const [nodesRaw, rawShards] = [args.slice(0, 2), args.slice(2)];

  const [fromNodeIndex, toNodeIndex] = await validateItems({ rawItems: nodesRaw }).catch(() => []);
  if (!fromNodeIndex || !toNodeIndex) return;

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
  if (!shards) return;

  return [fromNodeIndex, toNodeIndex, shards] as const;
}

export default async function handleCopy(args: string[]) {
  const [fromNodeIndex, toNodeIndex, shards] = (await getFromToAndShards(args)) || [];
  if (!fromNodeIndex || !toNodeIndex || !shards) return;

  for (const shard of shards) {
    await sendHTMLMessage(`Copying data from node ${fromNodeIndex} to node ${toNodeIndex} on ${shard}...`);
    await duplicatedFilesCleaner.copyData({
      from: fromNodeIndex as unknown as string,
      to: toNodeIndex as unknown as string,
      shards: [shard],
    });
  }

  await sendMessage("Done!");
}
