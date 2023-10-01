import axiod from "axiod";
import moment from "moment";
import { lodash as _ } from "lodash";
import { cronsStarted } from "../crons/crons.ts";
import Node from "../types/collections/node.type.ts";
import getSyncState from "../incognito/getSyncState.ts";
import { getNodes } from "../controllers/node.controller.ts";
import getBlockchainInfo from "../incognito/getBlockchainInfo.ts";
import maxPromises from "../duplicatedFilesCleaner/utils/maxPromises.ts";
import duplicatedFilesCleaner from "../controller/duplicatedFilesCleaner.ts";
import repeatUntilNoError from "../duplicatedFilesCleaner/utils/repeatUntilNoError.ts";
import { ShardsStr, shardsNumbersStr } from "../duplicatedFilesCleaner/types/shards.type.ts";

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
export const allNodeRoles: NodeRoles[] = ["PENDING", "COMMITTEE", "WAITING", "SYNCING", "NOT_STAKED"];
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
  onlyActive?: boolean;
}

/**
 * @param param0.dockerIndexes The docker indexes to get the status from. If not provided, it will get the status from all the nodes. If it's an empty array, it will return an empty array.
 * @param param0.fullData If true, returns the block height for each shard
 * @param param0.onliActive If true, only returns the active nodes. Default: true
 */
export default async function getNodesStatus({
  dockerIndexes = duplicatedFilesCleaner.dockerIndexes,
  fullData,
  onlyActive = true,
}: GetNodesStatusOptions = {}): Promise<NodeStatus[]> {
  if (dockerIndexes.length === 0) return [];

  const nodes = await getNodes({
    ...(onlyActive ? { inactive: { $ne: true } } : {}),
    dockerIndex: { $in: dockerIndexes.map((d) => Number(d)) },
  });
  const rawData = await getRawData(nodes.map((n) => n.validatorPublic));

  const blockchainInfo = fullData ? await getBlockchainInfo() : null;

  const results: NodeStatus[] = [];

  if (!cronsStarted) console.time("getAllSyncState");
  await maxPromises(
    rawData.map((d) => async () => {
      const node = nodes.find((n) => n.validatorPublic === d.MiningPubkey);
      if (!node) return;

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
        const syncState = await repeatUntilNoError(() => getSyncState(node.validatorPublic), 5);
        if (!syncState) console.log("syncState is null");
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

      return;
    }),
    20
  );
  if (!cronsStarted) console.timeEnd("getAllSyncState");

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

  if (!cronsStarted) console.time("getAllRawData");
  const allData = await maxPromises(
    _.chunk(mpks, 20).map(
      (c) => async () =>
        await repeatUntilNoError(() =>
          axiod.post<NodeStatusRawData[]>("https://monitor.incognito.org/pubkeystat/stat", { mpk: c.join(",") })
        )
    ),
    6
  );
  if (!cronsStarted) console.timeEnd("getAllRawData");

  for (const data of allData) {
    results.push(...data.data);
    for (const d of data.data) lastRequests[d.MiningPubkey] = { data: d, time: Date.now() };
  }

  return results;
}
