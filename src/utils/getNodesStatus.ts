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

export default async function getNodesStatus() {
  return (await getRawData()).map((d) => ({
    role: d.Role || "WAITING",
    alert: d.Alert,
    status: d.Status,
    isSlashed: d.IsSlashed,
    shard: d.CommitteeChain,
    syncState: d.SyncState || "-",
    isOldVersion: d.IsOldVersion,
    epochsToNextEvent: Number(d.NextEventMsg.match(/\d+/)?.[0] ?? 0),
    ...constants.find((c) => c.publicValidatorKey === d.MiningPubkey)!,
  }));
}

let lastRequestDate = 0;
let lastRequest: RawData[] | undefined = undefined;
const minRequestInterval = 2000;

async function getRawData() {
  if (Date.now() - lastRequestDate < minRequestInterval && lastRequest) return lastRequest;

  const { data } = await axiod.post<RawData[]>("https://monitor.incognito.org/pubkeystat/stat", { mpk });
  lastRequestDate = Date.now();
  lastRequest = data;
  return data;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type NodeStatus = UnwrapPromise<ReturnType<typeof getNodesStatus>>[number];
