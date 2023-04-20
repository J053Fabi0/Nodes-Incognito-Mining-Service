import { byValues, byNumber, byString } from "sort-es";
import getNodesStatus, { NodeStatus } from "./getNodesStatus.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import { Info, ShardsNames, shardsNames, normalizeShard } from "duplicatedFilesCleanerIncognito";

type InstructionToMoveOrDelete =
  | { shards: ShardsNames[]; from: string; to: string; action: "move" }
  | { shards: ShardsNames[]; from: string; to?: undefined; action: "delete" };

export default async function instructionsToMoveOrDelete() {
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

  const instructions = [] as InstructionToMoveOrDelete[];

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
        const existingInstruction = instructions.find(
          ({ to: t, action, from }) => t === to && action === "move" && from === name
        );
        if (existingInstruction) existingInstruction.shards.push(shard);
        else if (to) instructions.push({ to, from: name, shards: [shard], action: "move" });
        else instructions.push({ from: name, shards: [shard], action: "delete" });
      }
    }
  }

  return instructions;
}

export async function getTextInstructionsToMoveOrDelete() {
  const instructions = await instructionsToMoveOrDelete();

  if (instructions.length)
    return `- <code>${instructions
      .map(({ action, from, to, shards }) => `${action} ${from} ${to ? `${to} ` : ""}${shards.join(" ")}`)
      .join("</code>\n- <code>")}</code>`;
  else return "No moves necessary.";
}
