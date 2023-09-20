import axiod from "axiod";

interface Metadata {
  Type: number;
  FunderPaymentAddress: string;
  RewardReceiverPaymentAddress: string;
  StakingAmountShard: number;
  AutoReStaking: boolean;
  CommitteePublicKey: string;
}

interface IOCoin {
  Version: number;
  Index: number;
  Info: string;
  PublicKey: string;
  Commitment: string;
  KeyImage: string;
  TxRandom: string;
  Value: string;
  Randomness: string;
}

interface TransactionRaw {
  BlockHash: string;
  BlockHeight: number;
  TxSize: number;
  Index: number;
  ShardID: number;
  Hash: string;
  Version: number;
  Type: string;
  /** Add ".000Z" at the end to parse to Date */
  LockTime: string;
  RawLockTime: number;
  Fee: number;
  Image: string;
  IsPrivacy: boolean;
  Proof: string;
  ProofDetail: {
    InputCoins: null | IOCoin[];
    OutputCoins: null | IOCoin[];
  };
  InputCoinPubKey: string;
  /** A strigified JSON */
  SigPubKey: string;
  RawSigPubKey: string;
  Sig: string;
  /** A strigified JSON */
  Metadata: string;
  CustomTokenData: string;
  PrivacyCustomTokenID: string;
  PrivacyCustomTokenName: string;
  PrivacyCustomTokenSymbol: string;
  PrivacyCustomTokenData: string;
  PrivacyCustomTokenProofDetail: {
    InputCoins: null | IOCoin[];
    OutputCoins: null | IOCoin[];
  };
  PrivacyCustomTokenIsPrivacy: boolean;
  PrivacyCustomTokenFee: number;
  IsInMempool: boolean;
  IsInBlock: boolean;
  Info: string;
}

interface Transaction extends Omit<TransactionRaw, "Metadata"> {
  Metadata: Metadata;
}

export default async function getTransactionByHash(txHash: string): Promise<Transaction> {
  const { data } = await axiod.post<{ Result: TransactionRaw | null; Error: null | string }>(
    "https://mainnet.incognito.org/fullnode",
    {
      id: 1,
      jsonrpc: "1.0",
      params: [txHash],
      method: "gettransactionbyhash",
    }
  );

  if (!data.Result) throw new Error(data.Error ?? "No result");

  return {
    ...data.Result,
    Metadata: JSON.parse(data.Result.Metadata) as Metadata,
  };
}
