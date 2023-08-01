import axiod from "axiod";
import constants from "../constants.ts";
import Node from "../types/collections/node.type.ts";
import { ShardsStr } from "duplicatedFilesCleanerIncognito";
import { getNodes } from "../controllers/node.controller.ts";

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

export type NodeRoles = "PENDING" | "COMMITTEE" | "WAITING" | "SYNCING" | "NOT_STAKED";
export interface NodeStatus extends Node {
  alert: boolean;
  status: "ONLINE" | "OFFLINE";
  isSlashed: boolean;
  shard: ShardsStr | "";
  role: NodeRoles;
  isOldVersion: boolean;
  syncState: "BEACON SYNCING" | "LATEST" | "-" | "BEACON STALL" | "SHARD SYNCING" | "SHARD STALL";
  epochsToNextEvent: number;
  validatorPublic: string;
  voteStat: null | number; // between 0 and 100
}

export default async function getNodesStatus(): Promise<NodeStatus[]> {
  const validatorKeys = constants.map((c) => c.validatorPublic);
  const nodes = await getNodes({ inactive: { $ne: true }, validatorPublic: { $in: validatorKeys } });
  const rawData = await getRawData(validatorKeys);

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
        role: d.Role || "NOT_STAKED",
        isOldVersion: d.IsOldVersion,
        syncState: d.SyncState || "-",
        epochsToNextEvent: Number(d.NextEventMsg.match(/\d+/)?.[0] ?? 0),
        voteStat: d.VoteStat[0] === "" ? null : Number(d.VoteStat[0]?.match(/\d+/)?.[0] ?? 0),
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
  CommitteeChain: ShardsStr | "";
  Status: "ONLINE" | "OFFLINE";
  Role: "PENDING" | "COMMITTEE" | "WAITING" | "SYNCING" | "";
  SyncState: "BEACON SYNCING" | "LATEST" | "-" | "BEACON STALL" | "SHARD SYNCING" | "SHARD STALL" | "";
  VoteStat: [string, string] | [undefined, undefined]; // 97 (epoch:10997) or an empty string
}

let lastRequestTime = 0;
const minRequestInterval = 5_000; // 5 seconds
let lastRequest: NodeStatusRawData[] | undefined = undefined;

/**
 * @param mpk The public validator keys separated by commas without spaces, or an array of public validator keys
 */
async function getRawData(mpk: string | string[]) {
  if (lastRequest && Date.now() - lastRequestTime < minRequestInterval) return lastRequest;

  const { data } = await axiod.post<NodeStatusRawData[]>("https://monitor.incognito.org/pubkeystat/stat", {
    mpk: Array.isArray(mpk) ? mpk.join(",") : mpk,
  });
  lastRequestTime = Date.now();
  lastRequest = data;
  return data;
}
