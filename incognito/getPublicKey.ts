import { shardsNumbers } from "duplicatedFilesCleanerIncognito";
import getBeaconBestState from "./getBeaconBestState.ts";

export default async function getPublicKey(validatorPublic: string): Promise<string | null> {
  const beaconBestState = await getBeaconBestState();

  for (const nodeInfo of beaconBestState.AutoStaking)
    if (nodeInfo.MiningPubKey.bls === validatorPublic) return nodeInfo.IncPubKey;

  for (const key of [
    "BeaconCommittee",
    "CandidateShardWaitingForCurrentRandom",
    "CandidateShardWaitingForNextRandom",
  ] as const) {
    for (const [publicKey, nodeInfo] of Object.entries(beaconBestState[key]))
      if (nodeInfo.MiningPubKey.bls === validatorPublic) return publicKey;
  }

  for (const key of ["ShardCommittee", "ShardPendingValidator", "SyncingValidator"] as const) {
    for (const shard of shardsNumbers)
      for (const [publicKey, nodeInfo] of Object.entries(beaconBestState[key][shard]))
        if (nodeInfo.MiningPubKey.bls === validatorPublic) return publicKey;
  }

  return null;
}
