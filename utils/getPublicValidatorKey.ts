import axiod from "axiod";
import handleError from "./handleError.ts";
import { NodeRoles } from "./getNodesStatus.ts";
import { docker, dockerPs } from "../duplicatedFilesCleaner/utils/commands.ts";
import repeatUntilNoError from "../duplicatedFilesCleaner/utils/repeatUntilNoError.ts";

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
      const dockerStatus = await dockerPs([dockerIndex]);
      if (!dockerStatus[dockerIndex]?.running) await docker(`inc_mainnet_${dockerIndex}`, "start");

      const {
        data: { Result: result, Error: error },
      } = await axiod.post<GetMiningInfoResponse>(`http://${nodeName}.nodes.josefabio.com`, {
        id: 1,
        params: "",
        jsonrpc: "1.0",
        method: "getmininginfo",
      });
      if (error) throw new Error(error);
      if (!result) throw new Error("No result");
      if (!result.MiningPublickey) throw new Error("No MiningPublickey");

      return result;
    },
    120,
    2
  );
}
