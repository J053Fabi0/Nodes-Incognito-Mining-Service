import { NodeRoles } from "../utils/getNodesStatus.ts";
import getBeaconBestState from "./getBeaconBestState.ts";
import { shardsNumbers } from "duplicatedFilesCleanerIncognito";

enum Statuses {
  NotStaked = "NOT_STAKED",
  ShardCommittee = "COMMITTEE",
  SyncingValidator = "SYNCING",
  ShardPendingValidator = "PENDING",
  CandidateShardWaitingForNextRandom = "WAITING",
  CandidateShardWaitingForCurrentRandom = "WAITING",
}

export default async function getNodeRole(validatorPublic: string): Promise<NodeRoles> {
  const beaconBestState = await getBeaconBestState();

  for (const key of ["CandidateShardWaitingForCurrentRandom", "CandidateShardWaitingForNextRandom"] as const) {
    for (const nodeInfo of Object.values(beaconBestState[key]))
      if (nodeInfo.MiningPubKey.bls === validatorPublic) return Statuses[key];
  }

  for (const key of ["ShardCommittee", "ShardPendingValidator", "SyncingValidator"] as const) {
    for (const shard of shardsNumbers)
      for (const nodeInfo of Object.values(beaconBestState[key][shard]))
        if (nodeInfo.MiningPubKey.bls === validatorPublic) return Statuses[key];
  }

  return Statuses.NotStaked;
}
