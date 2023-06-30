import IncognitoCli from "../IncognitoCli.ts";
import UncapitalizeObject from "../../types/uncapitalizeObject.ts";

interface Options {
  /** The number of shards (default: 8) */
  numShards?: number;
  /** A specific shardID (-2: same shard as the first account (i.e, Anon); -1: any shard) (default: -2) */
  shardID?: number;
  /** The number of accounts (default: 1) */
  numAccounts?: number;
  /** Send its otaKey to the server after creation */
  submitKey?: boolean;
}

/** Capitalized Generated account */
export interface CapAccount {
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

export type Account = Omit<UncapitalizeObject<CapAccount>, "oTAPrivateKey"> & {
  otaPrivateKey: CapAccount["OTAPrivateKey"];
};

/** Capitalized Generated accounts */
export interface CapGenerateAccount {
  Mnemonic: string;
  Accounts: CapAccount[];
}

export type GenerateAccount = Omit<UncapitalizeObject<CapGenerateAccount>, "accounts"> & {
  accounts: Account[];
};

export default async function generateAccount(this: IncognitoCli, options?: Options): Promise<GenerateAccount> {
  const args = ["account", "generate"];
  if (options?.shardID) args.push("--shardID", options.shardID.toString());
  if (options?.numShards) args.push("--numShards", options.numShards.toString());
  if (options?.numAccounts) args.push("--numAccounts", options.numAccounts.toString());

  const { Mnemonic, Accounts } = JSON.parse(await this.incognitoCli(args)) as CapGenerateAccount;

  if (options?.submitKey)
    for (const { OTAPrivateKey } of Accounts) await this.submitKeyAccount({ otaKey: OTAPrivateKey });

  return {
    mnemonic: Mnemonic,
    accounts: Accounts.map((a) => ({
      index: a.Index,
      privateKey: a.PrivateKey,
      publicKey: a.PublicKey,
      paymentAddressV1: a.PaymentAddressV1,
      paymentAddress: a.PaymentAddress,
      readOnlyKey: a.ReadOnlyKey,
      otaPrivateKey: a.OTAPrivateKey,
      miningKey: a.MiningKey,
      miningPublicKey: a.MiningPublicKey,
      validatorPublicKey: a.ValidatorPublicKey,
      shardID: a.ShardID,
    })),
  };
}
