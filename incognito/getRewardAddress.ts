import getBeaconBestState from "./getBeaconBestState.ts";

export default async function getRewardAddress(publicKey: string): Promise<string | null> {
  const beaconBestState = await getBeaconBestState();
  return beaconBestState.RewardReceiver[publicKey] || null;
}
