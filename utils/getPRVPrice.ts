import axiod from "axiod";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { IS_PRODUCTION } from "../env.ts";

dayjs.extend(utc);

interface Price {
  "incognito-2": { usd: number };
}

export let latestRequest = dayjs().utc().subtract(1, "days");
let lastestPrice = 0;

/**
 * @returns The price of PRV in USD
 */
export default async function getPRVPrice(): Promise<number> {
  // cache the price for 1 hour
  if (dayjs().utc().diff(latestRequest, "hour") < 1) return lastestPrice;

  // fake data for development
  const data = IS_PRODUCTION
    ? await axiod.get<Price>("https://api.coingecko.com/api/v3/simple/price?ids=incognito-2&vs_currencies=usd")
    : { data: { "incognito-2": { usd: 0.135316 } } };

  latestRequest = dayjs();

  return (lastestPrice = data.data["incognito-2"].usd);
}
