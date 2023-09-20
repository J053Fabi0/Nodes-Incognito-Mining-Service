import axiod from "axiod";

export default async function getNodeTotalRewards(rewardAddress: string): Promise<number | null> {
  const { data } = await axiod.post<{ Result: { PRV: number } | null; Error: null | { StackTrace: string } }>(
    "https://mainnet.incognito.org/fullnode",
    { jsonrpc: "1.0", method: "getrewardamount", params: [rewardAddress], id: 1 }
  );

  if (data.Error) {
    if (data.Error.StackTrace.includes("Serialized key type is invalid"))
      throw new Error("Serialized key type is invalid");
    if (data.Error.StackTrace.includes("Serialized key is invalid")) throw new Error("Serialized key is invalid");

    throw new Error(data.Error.StackTrace);
  }

  return data.Result?.PRV ?? null;
}
