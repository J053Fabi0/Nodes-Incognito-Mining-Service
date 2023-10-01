import axiod from "axiod";
import { ShardsStr } from "../duplicatedFilesCleaner/types/shards.type.ts";

export interface BestBlockRaw {
  Height: number;
  Hash: string;
  TotalTxs: number;
  BlockProducer: string;
  ValidationData: string;
  /** Only beacon shard has this value not set to 0 */
  Epoch: number;
  Time: number;
  /** Only beacon shard has this value not set to 0 */
  RemainingBlockEpoch: number;
  /** Only beacon shard has this value not set to 0 */
  EpochBlock: number;
}

export interface BlockchainInfoRaw {
  ChainName: string;
  BestBlocks: Record<ShardsStr | "-1", BestBlockRaw>;
  ActiveShards: number;
}

interface MethodResponse {
  Id: number;
  Result: BlockchainInfoRaw;
  Error: null;
  Params: "";
  Method: "getblockchaininfo";
  Jsonrpc: "1.0";
}

const minRequestInterval = 12_000; // 5 seconds
// The key is the mpk
let lastRequests: { time: number; result: BlockchainInfoRaw | null } | undefined;

const postData = { jsonrpc: "1.0", method: "getblockchaininfo", params: "", id: 2 };

export default async function getBlockchainInfo(): Promise<BlockchainInfoRaw | null> {
  const lastRequest = lastRequests;
  if (lastRequest && Date.now() - lastRequest.time < minRequestInterval && lastRequest.result)
    return lastRequest.result;

  const { data } = await axiod.post<MethodResponse | Record<string, never>>(
    "https://mainnet.incognito.org/fullnode",
    postData
  );

  const result = "Result" in data ? (data as MethodResponse).Result : null;

  lastRequests = { time: Date.now(), result };

  return result;
}
