import { getFromToAndShards } from "./handleCopy.ts";
import sendMessage, { sendHTMLMessage } from "../sendMessage.ts";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";

export default async function handleMove(args: string[]) {
  const [fromNodeIndex, toNodeIndex, shards] = (await getFromToAndShards(args)) || [];
  if (!fromNodeIndex || !toNodeIndex || !shards) return;

  for (const shard of shards) {
    await sendHTMLMessage(`Moving data from node ${fromNodeIndex} to node ${toNodeIndex} on ${shard}...`);
    await duplicatedFilesCleaner.move(fromNodeIndex, toNodeIndex, [shard]);
  }

  await sendMessage("Done!");
}
