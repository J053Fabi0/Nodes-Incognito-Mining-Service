import getBeaconBestState from "./getBeaconBestState.ts";
import getTransactionByHash from "./getTransactionByHash.ts";

export default async function getRewardAddress(publicKey: string): Promise<string | null> {
  const beaconBestState = await getBeaconBestState();

  const stakingTx = beaconBestState.StakingTx[publicKey];
  if (!stakingTx) return null;

  const transaction = await getTransactionByHash(stakingTx);

  return transaction.Metadata.RewardReceiverPaymentAddress;
}
