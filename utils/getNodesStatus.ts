import axiod from "axiod";
import moment from "moment";
import { lodash as _ } from "lodash";
import Node from "../types/collections/node.type.ts";
import getSyncState from "../incognito/getSyncState.ts";
import { getNodes } from "../controllers/node.controller.ts";
import getBlockchainInfo from "../incognito/getBlockchainInfo.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { ShardsStr, shardsNumbersStr } from "duplicatedFilesCleanerIncognito";

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
  shardsBlockHeights: Record<ShardsStr | "-1", { node: number; latest: number }> | null;
}

interface GetNodesStatusOptions {
  dockerIndexes?: (number | string)[];
  fullData?: boolean;
}

/**
 * @param param0.dockerIndexes The docker indexes to get the status from. If not provided, it will get the status from all the nodes. If it's an empty array, it will return an empty array.
 * @param param0.fullData If true, returns the block height for each shard
 * @returns
 */
export default async function getNodesStatus({
  dockerIndexes = duplicatedFilesCleaner.dockerIndexes,
  fullData,
}: GetNodesStatusOptions = {}): Promise<NodeStatus[]> {
  if (dockerIndexes.length === 0) return [];

  const nodes = await getNodes({
    inactive: { $ne: true },
    dockerIndex: { $in: dockerIndexes.map((d) => Number(d)) },
  });
  const rawData = await getRawData(nodes.map((n) => n.validatorPublic));

  const blockchainInfo = fullData ? await getBlockchainInfo() : null;

  const results: NodeStatus[] = [];

  for (const d of rawData) {
    const node = nodes.find((n) => n.validatorPublic === d.MiningPubkey);
    if (!node) continue;

    const result: NodeStatus = {
      ...node,
      alert: d.Alert,
      status: d.Status,
      isSlashed: d.IsSlashed,
      shard: d.CommitteeChain,
      shardsBlockHeights: null,
      role: d.Role || "NOT_STAKED",
      isOldVersion: d.IsOldVersion,
      syncState: d.SyncState || "-",
      epochsToNextEvent: Number(d.NextEventMsg.match(/\d+/)?.[0] ?? 0),
      voteStat: d.VoteStat[0] === "" ? null : Number(d.VoteStat[0]?.match(/\d+/)?.[0] ?? 0),
    };

    thisIf: if (blockchainInfo) {
      const syncState = await getSyncState(d.MiningPubkey);
      if (!syncState) break thisIf;

      const shardsBlockHeights = {} as Exclude<NodeStatus["shardsBlockHeights"], null>;

      for (const shard of [...shardsNumbersStr, "-1" as const]) {
        const shardBlockHeight =
          shard === "-1" ? syncState.Beacon.BlockHeight : syncState.Shard[shard].BlockHeight;
        const latestBlockHeight = blockchainInfo.BestBlocks[shard].Height;
        shardsBlockHeights[shard] = { node: shardBlockHeight, latest: latestBlockHeight };
      }

      result.shardsBlockHeights = shardsBlockHeights;
    }

    results.push(result);
  }

  return results;
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

const maxRequestSeconds = 10;
const lastRequests: Record<
  string,
  | {
      data: NodeStatusRawData;
      time: number;
    }
  | undefined
> = {};

/** @param mpk The public validator keys separated by commas without spaces, or an array of public validator keys */
async function getRawData(mpk: string | string[], fetchAll = false): Promise<NodeStatusRawData[]> {
  const mpks = Array.isArray(mpk) ? mpk : mpk.split(",");
  const toFetch: string[] = fetchAll ? mpks : [];
  const results: NodeStatusRawData[] = [];

  if (toFetch.length === 0)
    for (const mpk of mpks) {
      const lastRequest = lastRequests[mpk];
      if (lastRequest && moment().diff(moment(lastRequest.time), "seconds") < maxRequestSeconds)
        results.push(lastRequest.data);
      else toFetch.push(mpk);
    }

  if (toFetch.length === 0) return results;

  for (const chunk of _.chunk(mpks, 50)) {
    const { data } = await axiod.post<NodeStatusRawData[]>("https://monitor.incognito.org/pubkeystat/stat", {
      mpk: chunk.join(","),
    });
    results.push(...data);

    for (const d of data) lastRequests[d.MiningPubkey] = { data: d, time: Date.now() };
  }

  return results;
}
