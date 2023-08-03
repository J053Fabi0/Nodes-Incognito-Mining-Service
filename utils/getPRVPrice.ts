import axiod from "axiod";
import moment from "moment";
import { moveDecimalDot, toFixedS } from "./numbersString.ts";
import handleError from "./handleError.ts";

// To get this pair id, run pdexv3_getState with this filter:
// "Key": "PoolPairs",
// "Verbosity": 2,
// "ID": ""
const PAIR_ID =
  "0000000000000000000000000000000000000000000000000000000000000004-076a4423fa20922526bd50b0d7b0dc1c593ce16e15ba141ede5fb5a28aa3f229-33a8ceae6db677d9860a6731de1a01de7e1ca7930404d7ec9ef5028f226f1633" as const;

type PoolPairs = {
  Result: {
    PoolPairs: {
      [x: string]: {
        State: {
          Token0VirtualAmount: number;
          Token1VirtualAmount: number;
        };
      };
    };
  };
  Error: null;
};

type PoolPairsError = {
  Result: null;
  Error: {
    Code: number;
    Message: string;
    StackTrace: string;
  };
};

export let latestRequest = moment().utc().subtract(1, "days");
let lastestPrice = 0;

/**
 * @returns The price of PRV in USD
 */
export default async function getPRVPrice(): Promise<number> {
  // cache the price for 1 hour
  if (moment().utc().diff(latestRequest, "hour") < 1) return lastestPrice;

  // fake data for development
  const { data } = await axiod.post<PoolPairs | PoolPairsError>("https://mainnet.incognito.org/fullnode", {
    id: 1,
    jsonrpc: "1.0",
    method: "pdexv3_getState",
    params: [
      {
        BeaconHeight: 0,
        Filter: {
          Key: "PoolPair",
          Verbosity: 0,
          ID: PAIR_ID,
        },
      },
    ],
  });

  if (data.Error) {
    console.error(data.Error.Code, data.Error.StackTrace);
    handleError(new Error(data.Error.Message));
    return lastestPrice;
  }

  const { Token0VirtualAmount, Token1VirtualAmount } = data.Result.PoolPairs[PAIR_ID].State;

  latestRequest = moment();

  return (lastestPrice = +moveDecimalDot(toFixedS((Token1VirtualAmount / Token0VirtualAmount) * 1e9, 0), -9));
}
