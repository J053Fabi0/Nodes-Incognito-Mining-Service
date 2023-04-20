import axiod from "axiod";
import constants from "../../constants.ts";
import { ShardsStr } from "duplicatedFilesCleanerIncognito";

const mpk = constants.map((c) => c.publicValidatorKey).join(",");

export type NodeStatusKeys =
  | "role"
  | "name"
  | "alert"
  | "shard"
  | "status"
  | "isSlashed"
  | "isOldVersion"
  | "epochsToNextEvent"
  | "publicValidatorKey";

export default async function getNodesStatus() {
  return (await getRawData()).map((d) => ({
    alert: d.Alert,
    status: d.Status,
    isSlashed: d.IsSlashed,
    shard: d.CommitteeChain,
    role: d.Role || "WAITING",
    isOldVersion: d.IsOldVersion,
    syncState: d.SyncState || "-",
    epochsToNextEvent: Number(d.NextEventMsg.match(/\d+/)?.[0] ?? 0),
    ...constants.find((c) => c.publicValidatorKey === d.MiningPubkey)!,
  }));
}

interface RawData {
  Alert: boolean;
  IsSlashed: boolean;
  MiningPubkey: string;
  NextEventMsg: string;
  IsOldVersion: boolean;
  CommitteeChain: ShardsStr;
  Status: "ONLINE" | "OFFLINE";
  Role: "PENDING" | "COMMITTEE" | "WAITING" | "SYNCING";
  SyncState: "BEACON SYNCING" | "LATEST" | "-" | "BEACON STALL" | "SHARD SYNCING" | "SHARD STALL";
}

let lastRequestTime = 0;
const minRequestInterval = 5000;
let lastRequest: RawData[] | undefined = undefined;

async function getRawData() {
  if (Date.now() - lastRequestTime < minRequestInterval && lastRequest) return lastRequest;

  const { data } = await axiod.post<RawData[]>("https://monitor.incognito.org/pubkeystat/stat", { mpk });
  lastRequestTime = Date.now();
  lastRequest = data;
  return data;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type NodeStatus = UnwrapPromise<ReturnType<typeof getNodesStatus>>[number];
