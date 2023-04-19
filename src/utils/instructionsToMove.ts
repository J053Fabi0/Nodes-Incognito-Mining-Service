import { byValues, byNumber, byString } from "sort-es";
import getNodesStatus, { NodeStatus } from "./getNodesStatus.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import sendMessage, { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { Info, ShardsNames, shardsNames, normalizeShard } from "duplicatedFilesCleanerIncognito";

export default async function instructionsToMove() {
  const nodesStatus = (await getNodesStatus()).reduce(
    (obj, node) => ((obj[node.dockerIndex] = node), obj),
    {} as Record<string, NodeStatus>
  );

  const nodesInfo = Object.entries(await duplicatedFilesCleaner.getInfo())
    .map(
      ([name, info]) =>
        [name, { ...info, shard: normalizeShard(nodesStatus[name].shard) }] as [
          string,
          Info & { shard: ShardsNames }
        ]
    )
    .sort(
      byValues([
        // Sort first by the role. Commitee goes first.
        [([name]) => nodesStatus[name].role, byString()],
        // then by how many epochs to the next event
        [([name]) => nodesStatus[name].epochsToNextEvent, byNumber()],
      ])
    );

  const instructions = [] as { shard: ShardsNames; from: string; to?: string; action: "move" | "delete" }[];

  for (const shard of shardsNames) {
    const nodesWithShard = nodesInfo
      .filter(([, { [shard]: a }]) => a > duplicatedFilesCleaner.minFilesToConsiderShard)
      .map(([name]) => name);
    if (nodesWithShard.length === 0) continue;

    const nodesWhoShouldHaveShard = (
      shard === "beacon" ? nodesInfo : nodesInfo.filter(([, { shard: s }]) => s === shard)
    )
      .slice(0, nodesWithShard.length)
      .map(([name]) => name);

    for (const name of nodesWithShard) {
      // if this node should have the shard, ignore it
      const i = nodesWhoShouldHaveShard.indexOf(name);
      if (i !== -1) nodesWhoShouldHaveShard.splice(i, 1);
      //
      // if it shouldn't have the shard, add an instruction
      else {
        const to = nodesWhoShouldHaveShard.shift();
        instructions.push({
          shard,
          from: name,
          to,
          action: to ? "move" : "delete", // if no more nodes need the shard, delete it
        });
      }
    }
  }

  if (instructions)
    return sendHTMLMessage(
      `- <code>${instructions
        .map(({ action, from, to, shard }) => `${action} ${from} ${to ? `${to} ` : ""}${shard}`)
        .join("</code>\n\n- <code>")}</code>`
    );
  else return sendMessage("No moves necessary.");
}
