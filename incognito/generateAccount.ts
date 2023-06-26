import IncognitoCli from "./IncognitoCli.ts";

interface Options {
  /** The number of shards (default: 8) */
  numShards?: number;
  /** A specific shardID (-2: same shard as the first account (i.e, Anon); -1: any shard) (default: -2) */
  shardID?: number;
  /** The number of accounts (default: 1) */
  numAccounts?: number;
}

export interface Account {
  Index: number;
  PrivateKey: string;
  PublicKey: string;
  PaymentAddressV1: string;
  PaymentAddress: string;
  ReadOnlyKey: string;
  OTAPrivateKey: string;
  MiningKey: string;
  MiningPublicKey: string;
  ValidatorPublicKey: string;
  ShardID: number;
}

export interface GenerateAccount {
  Mnemonic: string;
  Accounts: Account[];
}

export default async function generateAccount(this: IncognitoCli, options?: Options) {
  const args = ["account", "generate"];
  if (options?.numShards) args.push("--numshards", options.numShards.toString());
  if (options?.shardID) args.push("--shardid", options.shardID.toString());
  if (options?.numAccounts) args.push("--numaccounts", options.numAccounts.toString());

  const a = await this.incognitoCli(args);
  return JSON.parse(a) as GenerateAccount;
}
