import { minShardsToKeep } from "../constants.ts";
import sortNodes, { SortedNodes } from "./sortNodes.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { ShardsNames, shardsNames } from "duplicatedFilesCleanerIncognito";

type InstructionToMoveOrDelete =
  | { shards: ShardsNames[]; from: string; to?: undefined; action: "delete" }
  | { shards: ShardsNames[]; from: string; to: string; action: "move" | "copy" };

/**
 * @param sortedNodes If undefined, it will be fetched from sortNodes()
 */
export default async function getInstructionsToMoveOrDelete(
  sortedNodes: SortedNodes | Promise<SortedNodes> = sortNodes()
) {
  sortedNodes = sortedNodes instanceof Promise ? await sortedNodes : sortedNodes;
  const nodesInfo = sortedNodes.nodesInfoByDockerIndex;

  const instructions: InstructionToMoveOrDelete[] = [];

  for (const shard of shardsNames) {
    const nodesWithShard = nodesInfo
      .filter(([, { [shard]: a }]) => a && a > duplicatedFilesCleaner.minFilesToConsiderShard)
      .map(([dockerIndex]) => dockerIndex);
    if (nodesWithShard.length === 0) continue;

    const nodesWhoShouldHaveShard = (
      shard === "beacon" ? nodesInfo : nodesInfo.filter(([, { shard: s }]) => s === shard)
    )
      .slice(0, nodesWithShard.length)
      .map(([dockerIndex]) => dockerIndex);

    for (const dockerIndex of nodesWithShard) {
      // if this node should have the shard, ignore it
      const i = nodesWhoShouldHaveShard.indexOf(dockerIndex);
      if (i !== -1) nodesWhoShouldHaveShard.splice(i, 1);
      //
      // if it shouldn't have the shard, add an instruction
      else {
        const to = nodesWhoShouldHaveShard.shift();
        const existingInstruction = instructions.find(
          ({ to: t, action, from }) => action === "move" && t === to && from === dockerIndex
        );
        if (existingInstruction) existingInstruction.shards.push(shard);
        else if (to) instructions.push({ to, from: dockerIndex, shards: [shard], action: "move" });
        else instructions.push({ from: dockerIndex, shards: [shard], action: "delete" });
      }
    }
  }

  // if there are no shards to move or delete, see if there's any to copy
  if (instructions.length === 0) {
    const nodesStatus = sortedNodes.nodesStatusByDockerIndex;
    const nodesWithBeacon = nodesInfo.filter(([, n]) => Boolean(n.beacon));

    for (const [to, nodeWithBeacon] of nodesWithBeacon) {
      const shard = nodeWithBeacon.shard;
      if (!shard) continue;

      const hasShard = Boolean(nodeWithBeacon[shard]);
      if (hasShard) continue;

      // it doesn't have a shard, so find a node that has it
      const nodeWithShard =
        // first try to find one that is not in committee
        nodesWithBeacon.find(([index, n]) => nodesStatus[index]?.role !== "COMMITTEE" && Boolean(n[shard])) ??
        // if not, find one that is in committee
        nodesWithBeacon.find(([index, n]) => nodesStatus[index]?.role === "COMMITTEE" && Boolean(n[shard]));

      if (!nodeWithShard) continue;
      const [from] = nodeWithShard;

      instructions.push({ to, from, action: "copy", shards: [shard] });
    }

    // delete shards that are not being used
    const nodesWithShardButNoBeacon = nodesInfo.filter(([, n]) => n.shard && n[n.shard] && !n.beacon);
    const shardsCount = {} as Record<ShardsNames, number>;
    for (const shard of shardsNames) shardsCount[shard] = 0;
    for (const [, node] of nodesInfo) if (node.shard && node[node.shard]) shardsCount[node.shard]++;

    for (const [from, node] of nodesWithShardButNoBeacon) {
      const shard = node.shard;
      if (!shard) continue;

      if (shardsCount[shard] > minShardsToKeep) {
        instructions.push({ from, action: "delete", shards: [shard] });
        shardsCount[shard]--;
      }
    }
  }

  return instructions;
}

export async function getTextInstructionsToMoveOrDelete() {
  const instructions = await getInstructionsToMoveOrDelete();

  if (instructions.length) {
    const parsedInstructions = instructions.map(
      ({ action, from, to, shards }) => `${action} ${from} ${to ? `${to} ` : ""}${shards.join(" ")}`
    );
    return (
      `<code>${parsedInstructions.join("; </code>\n<code>")}; </code>\n\n` +
      `<code>${parsedInstructions.join("; ")}</code>`
    );
  } else return "No moves necessary.";
}
