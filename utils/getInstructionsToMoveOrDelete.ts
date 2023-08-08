import sortNodes from "./sortNodes.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { ShardsNames, shardsNames } from "duplicatedFilesCleanerIncognito";

type InstructionToMoveOrDelete =
  | { shards: ShardsNames[]; from: string; to: string; action: "move" }
  | { shards: ShardsNames[]; from: string; to?: undefined; action: "delete" };

export default async function getInstructionsToMoveOrDelete() {
  const { nodesInfoByDockerIndex: nodesInfo } = await sortNodes();

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
          ({ to: t, action, from }) => t === to && action === "move" && from === dockerIndex
        );
        if (existingInstruction) existingInstruction.shards.push(shard);
        else if (to) instructions.push({ to, from: dockerIndex, shards: [shard], action: "move" });
        else instructions.push({ from: dockerIndex, shards: [shard], action: "delete" });
      }
    }
  }

  return instructions;
}

export async function getTextInstructionsToMoveOrDelete() {
  const instructions = await getInstructionsToMoveOrDelete();

  if (instructions.length)
    return `<code>${instructions
      .map(({ action, from, to, shards }) => `${action} ${from} ${to ? `${to} ` : ""}${shards.join(" ")}`)
      .join("</code>\n<code>")}</code>`;
  else return "No moves necessary.";
}
