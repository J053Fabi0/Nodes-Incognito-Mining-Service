import axiod from "axiod";
import sortNodes from "./sortNodes.ts";
import handleError from "./handleError.ts";
import { NodeRoles } from "./getNodesStatus.ts";
import submitCommand from "../telegram/submitCommand.ts";
import { repeatUntilNoError } from "duplicatedFilesCleanerIncognito";

interface GetMiningInfoResult {
  ShardHeight: number;
  BeaconHeight: number;
  CurrentShardBlockTx: number;
  PoolSize: number;
  Chain: "mainnet";
  ShardID: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  Layer: "shard";
  Role: `${Uncapitalize<NodeRoles>}`;
  MiningPublickey: string;
  IsEnableMining: boolean;
}

interface GetMiningInfoResponse {
  Id: number;
  Result: GetMiningInfoResult | null;
  Error: string | null;
  Params: "";
  Method: "getmininginfo";
  Jsonrpc: "1.0";
}

export default async function getPublicValidatorKey(
  nodeName: string,
  dockerIndex: string | number
): Promise<string> {
  try {
    const miningInfo = await getMiningInfo(nodeName, dockerIndex);
    return miningInfo.MiningPublickey;
  } catch (e) {
    throw handleError(e);
  }
}

function getMiningInfo(nodeName: string, dockerIndex: string | number) {
  return repeatUntilNoError(
    async () => {
      const { nodesInfoByDockerIndex } = await sortNodes(undefined, { fromCacheIfConvenient: true });
      const nodeInfo = nodesInfoByDockerIndex.find(([di]) => di === dockerIndex);
      const isDockerRunning = Boolean(nodeInfo?.[1].docker.running);

      if (!isDockerRunning) await submitCommand(`docker start ${dockerIndex}`);

      const {
        data: { Result: result, Error: error },
      } = await axiod.post<GetMiningInfoResponse>(`http://${nodeName}.nodes.josefabio.com`, {
        id: 1,
        params: "",
        jsonrpc: "1.0",
        method: "getmininginfo",
      });
      if (!result) throw new Error(error!);

      return result;
    },
    120,
    2
  );
}
