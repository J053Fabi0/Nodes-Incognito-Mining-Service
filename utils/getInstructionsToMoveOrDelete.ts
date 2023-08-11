import sortNodes, { NodeInfoByDockerIndex } from "./sortNodes.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { ShardsNames, shardsNames } from "duplicatedFilesCleanerIncognito";

type InstructionToMoveOrDelete =
  | { shards: ShardsNames[]; from: string; to?: undefined; action: "delete" }
  | { shards: ShardsNames[]; from: string; to: string; action: "move" | "copy" };

/**
 * @param nodesInfoByDockerIndex If undefined, it will be fetched from sortNodes()
 */
export default async function getInstructionsToMoveOrDelete(
  nodesInfoByDockerIndex: NodeInfoByDockerIndex[] | Promise<NodeInfoByDockerIndex[]> = sortNodes().then(
    (a) => a.nodesInfoByDockerIndex
  )
) {
  const nodesInfo =
    nodesInfoByDockerIndex instanceof Promise ? await nodesInfoByDockerIndex : nodesInfoByDockerIndex;

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
    const nodesWithBeacon = nodesInfo.filter(([, n]) => Boolean(n.beacon));

    for (const [to, nodeWithBeacon] of nodesWithBeacon) {
      const shard = nodeWithBeacon.shard;
      if (!shard) continue;

      const hasShard = Boolean(nodeWithBeacon[shard]);
      if (hasShard) continue;

      // it doesn't have a shard, so find a node that has it
      const nodeWithShard = nodesWithBeacon.find(([, n]) => Boolean(n[shard]));
      if (!nodeWithShard) continue;
      const [from] = nodeWithShard;

      // instructions.push({ to, from, action: "copy", shards: [shard] });
      console.log(`copy ${from} ${to} ${shard}`);
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
