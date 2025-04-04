import { dataDir } from "./createDocker.ts";
import { docker } from "../../utils/commands.ts";
import handleError from "../../utils/handleError.ts";
import ignoreError from "../../utils/ignoreError.ts";
import doesDirExists from "../../utils/doesDirExists.ts";
import { Info } from "../../duplicatedFilesCleaner/src/getInfo.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import handleCopyOrMove from "../../telegram/handlers/handleCopyOrMove.ts";
import { ShardsNames, shardsNames } from "../../duplicatedFilesCleaner/types/shards.type.ts";

/**
 * Stops and removes a docker container. Removes also the data directory by default.
 */
export default async function deleteDocker(dockerIndex: number, deleteDataDir = true) {
  await docker(["stop", `inc_mainnet_${dockerIndex}`]).catch(console.error);

  const canDeleteDataDir = deleteDataDir && (await doesDirExists(`${dataDir}_${dockerIndex}`));

  thisIf: if (canDeleteDataDir) {
    duplicatedFilesCleaner.dockerIndexes;
    const nodesInfo = await duplicatedFilesCleaner.getInfo(
      duplicatedFilesCleaner.dockerIndexes.includes(dockerIndex)
        ? duplicatedFilesCleaner.dockerIndexes
        : [dockerIndex, ...duplicatedFilesCleaner.dockerIndexes]
    );

    const thisNodeInfo = nodesInfo[dockerIndex] as Info | undefined;
    if (!thisNodeInfo) break thisIf;

    const hasBeacon = thisNodeInfo.beacon !== undefined;
    const hasShardAndWhich = getShard(thisNodeInfo);

    // ignore autoMove for this node if any of its files are going to be moved to another node
    if (hasBeacon || hasShardAndWhich) ignoreError("autoMove", dockerIndex, 10);

    // try to move the beacon files to another node
    if (hasBeacon) await moveBeaconOrShardToOtherNode(nodesInfo, dockerIndex, "beacon");

    // try to move the shard's files to another node
    if (hasShardAndWhich !== null) await moveBeaconOrShardToOtherNode(nodesInfo, dockerIndex, hasShardAndWhich);
  }

  await docker(["rm", `inc_mainnet_${dockerIndex}`]).catch(handleError);

  if (canDeleteDataDir) await Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true }).catch(handleError);
}

function getShard(nodeInfo: Info): Exclude<ShardsNames, "beacon"> | null {
  for (const shardName of shardsNames) {
    if (shardName === "beacon") continue;
    if (nodeInfo[shardName] !== undefined) return shardName;
  }

  return null;
}

async function moveBeaconOrShardToOtherNode(
  nodesInfo: Record<string, Info>,
  fromDockerIndex: number,
  shardName: ShardsNames
) {
  const dockerIndexToMoveTo: string | null = (() => {
    // it doesn't matter if the target node is assigned to the same shard or not. AutoMove will handle it anyway
    for (const [dI, info] of Object.entries(nodesInfo))
      if (dI !== `${fromDockerIndex}` && !info[shardName] && !info.docker.running) return dI;
    return null;
  })();

  if (dockerIndexToMoveTo !== null)
    await handleCopyOrMove([`${fromDockerIndex}`, dockerIndexToMoveTo, shardName], "move", {
      telegramMessages: false,
    });
}
