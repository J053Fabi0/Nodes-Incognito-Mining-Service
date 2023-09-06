import axiod from "axiod";
import { ShardsNumbers } from "duplicatedFilesCleanerIncognito";

interface BeaconCommittee {
  IncPubKey: string;
  MiningPubKey: {
    bls: string;
    dsa: string;
  };
}

interface AutoStaking extends BeaconCommittee {
  IsAutoStaking: boolean;
}

interface MissingSignature {
  ActualTotal: number;
  Missing: number;
}

interface MissingSignaturePenalty {
  /** Usually 50% */
  MinPercent: number;
  Time: number;
  ForceUnstake: boolean;
}

interface BeaconBestState {
  BestShardHeight: Record<ShardsNumbers, number>;
  Epoch: number;
  BeaconHeight: number;
  BeaconCommittee: BeaconCommittee[];
  BeaconPendingValidator: BeaconCommittee[];
  BeaconWaiting: BeaconCommittee[];
  BeaconLocking: BeaconCommittee[];
  CandidateShardWaitingForCurrentRandom: BeaconCommittee[];
  CandidateBeaconWaitingForCurrentRandom: BeaconCommittee[];
  CandidateShardWaitingForNextRandom: BeaconCommittee[];
  CandidateBeaconWaitingForNextRandom: BeaconCommittee[];
  /** Public key : reward address */
  RewardReceiver: Record<string, string>;
  ShardCommittee: Record<ShardsNumbers, BeaconCommittee[]>;
  ShardPendingValidator: Record<ShardsNumbers, BeaconCommittee[]>;
  SyncingValidator: Record<ShardsNumbers, BeaconCommittee[]>;
  AutoStaking: AutoStaking[];
  /** Public key : tx */
  StakingTx: Record<string, string>;
  MaxBeaconCommitteeSize: number;
  MinBeaconCommitteeSize: number;
  MaxShardCommitteeSize: number;
  MinShardCommitteeSize: number;
  ActiveShards: number;
  /** Public key as key */
  MissingSignature: Record<string, MissingSignature>;
  /** Public key as key */
  MissingSignaturePenalty: Record<string, MissingSignaturePenalty>;
}

const minRequestInterval = 12_000; // 5 seconds
let lastRequests: { time: number; result: BeaconBestState | null } | undefined;

const postData = { jsonrpc: "1.0", method: "getbeaconbeststatedetail", params: [], id: 1 };

export default async function getBeaconBestState(): Promise<BeaconBestState> {
  const lastRequest = lastRequests;
  if (lastRequest && Date.now() - lastRequest.time < minRequestInterval && lastRequest.result)
    return lastRequest.result;

  const { data } = await axiod.post<{ Result: BeaconBestState | null; Error: null | string }>(
    "https://mainnet.incognito.org/fullnode",
    postData
  );

  if (!data.Result) throw new Error(data.Error ?? "No response");

  lastRequests = { time: Date.now(), result: data.Result };

  return data.Result;
}
