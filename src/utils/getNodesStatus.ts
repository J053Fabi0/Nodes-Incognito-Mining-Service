import axiod from "axiod";
import constants from "../../constants.ts";
import { ShardsStr } from "duplicatedFilesCleanerIncognito";
import { getNodes } from "../controllers/node.controller.ts";
import Node from "../types/collections/node.type.ts";

const mpk = constants.map((c) => c.validatorPublic).join(",");

export type NodeStatusKeys =
  | "role"
  | "name"
  | "alert"
  | "shard"
  | "status"
  | "isSlashed"
  | "isOldVersion"
  | "epochsToNextEvent"
  | "validatorPublic";

export interface NodeStatus extends Node {
  alert: boolean;
  status: "ONLINE" | "OFFLINE";
  isSlashed: boolean;
  shard: ShardsStr;
  role: "PENDING" | "COMMITTEE" | "WAITING" | "SYNCING";
  isOldVersion: boolean;
  syncState: "BEACON SYNCING" | "LATEST" | "-" | "BEACON STALL" | "SHARD SYNCING" | "SHARD STALL";
  epochsToNextEvent: number;
  validatorPublic: string;
}

export default async function getNodesStatus(): Promise<NodeStatus[]> {
  const nodes = await getNodes({ validatorPublic: { $in: constants.map((c) => c.validatorPublic) } });
  const rawData = await getRawData();

  return rawData
    .map((d) => {
      const node = nodes.find((n) => n.validatorPublic === d.MiningPubkey);
      if (!node) return null;

      return {
        ...node,
        alert: d.Alert,
        status: d.Status,
        isSlashed: d.IsSlashed,
        shard: d.CommitteeChain,
        role: d.Role || "WAITING",
        isOldVersion: d.IsOldVersion,
        syncState: d.SyncState || "-",
        epochsToNextEvent: Number(d.NextEventMsg.match(/\d+/)?.[0] ?? 0),
      } satisfies NodeStatus;
    })
    .filter((n) => n !== null) as NodeStatus[];
}

export interface NodeStatusRawData {
  Alert: boolean;
  IsSlashed: boolean;
  MiningPubkey: string;
  NextEventMsg: string;
  IsOldVersion: boolean;
  CommitteeChain: ShardsStr;
  Status: "ONLINE" | "OFFLINE";
  Role: "PENDING" | "COMMITTEE" | "WAITING" | "SYNCING" | "";
  SyncState: "BEACON SYNCING" | "LATEST" | "-" | "BEACON STALL" | "SHARD SYNCING" | "SHARD STALL" | "";
}

let lastRequestTime = 0;
const minRequestInterval = 5_000; // 5 seconds
let lastRequest: NodeStatusRawData[] | undefined = undefined;

async function getRawData() {
  if (lastRequest && Date.now() - lastRequestTime < minRequestInterval) return lastRequest;

  const { data } = await axiod.post<NodeStatusRawData[]>("https://monitor.incognito.org/pubkeystat/stat", {
    mpk,
  });
  lastRequestTime = Date.now();
  lastRequest = data;
  return data;
}
