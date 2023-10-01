import axiod from "axiod";
import { ShardsStr } from "../duplicatedFilesCleaner/types/shards.type.ts";

export interface SyncStateRaw {
  IsSync: boolean;
  LastInsert: string;
  BlockHeight: number;
  BlockTime: string;
  BlockHash: string;
}

export interface SyncStateResponseRaw {
  Beacon: SyncStateRaw;
  Shard: Record<ShardsStr, SyncStateRaw>;
}

const minRequestInterval = 12_000; // 5 seconds
// The key is the mpk
const lastRequests: Record<string, { time: number; result: SyncStateResponseRaw | null } | undefined> = {};

/** @param mpk The public validator key */
export default async function getSyncState(mpk: string): Promise<SyncStateResponseRaw | null> {
  const lastRequest = lastRequests[mpk];
  if (lastRequest && Date.now() - lastRequest.time < minRequestInterval && lastRequest.result)
    return lastRequest.result;

  const { data } = await axiod.post<SyncStateResponseRaw | Record<string, never>>(
    "https://monitor.incognito.org/pubkeystat/sync",
    { mpk }
  );

  const result = "Beacon" in data ? (data as SyncStateResponseRaw) : null;

  lastRequests[mpk] = { time: Date.now(), result };

  return result;
}
