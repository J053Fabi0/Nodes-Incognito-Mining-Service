import IncognitoCli from "./IncognitoCli.ts";

interface Options {
  /** The number of shards (default: 8) */
  numShards?: number;
  /** A specific shardID (-2: same shard as the first account (i.e, Anon); -1: any shard) (default: -2) */
  shardID?: number;
  /** The number of accounts (default: 1) */
  numAccounts?: number;
}

const a = {
  Mnemonic: "index inner toy tomato glass you circle adjust purse trade elephant scrap",
  Accounts: [
    {
      Index: 1,
      PrivateKey:
        "112t8rnXat5Y8SK5fczfLxQwU8f2ozZDJuKRPgrZ4uvZqEpEnRChjAZbi2rZk1nygLZx46TSNb4kyDjoN619xjqWDBYfLG5BskyXQJRw9w3q",
      PublicKey: "1YyKcXKCwLEqd6JoHrKMq1R2jPrh1BcMSZJAfzHWUWCVpHr5yx",
      PaymentAddressV1:
        "12Ru1zKdFRgoVKffmSu84Ctx6tFvTFg5sR8e6vefXZrarsM1qBhBFztWguDDayBtKHgtjpBj3ZxHbZXKmT19viAhittf4pwLDdeAfZF",
      PaymentAddress:
        "12sh8XUj3vgtnqqqnT67hniecSS9VFg592rTqxoW2XzVSnHcusBikZa2BZon4Eja7WzgN4DjM1FyGZumKzSZe6vBM7FjKpjfRbRgCvhQaGJkqg8gxNqewLCdxhg3sMub1o5kvVRmmC3bgxSR7ujs",
      ReadOnlyKey:
        "13hWc9hY1DmCW3L9PX5Uttst2cJ7fGfbydLTMuKFcWypnFHRGi8gvoa6JzZ5hZRQURdHwQsBfKg2Xk3pdvUgWgSsdLCENx5Q5jijjLy",
      OTAPrivateKey:
        "14y8CK5Sm1qbWkzd1bFqjaroxLLJsHf85qYGcsyqhU74hdDpUqgtNvZr5uCGyWx29txWnSS8ESEMSRQnajs5S9s3o9cWrBuv64eXY4H",
      MiningKey: "12kmvUH7SMbodoqNASLVLM4VG9Cyo3bvYJgwWbRUHLPDgBmstrn",
      MiningPublicKey:
        "121VhftSAygpEJZ6i9jGkEs7XdLcjmcHbY2MWxUajUS6JZQvGD9c5A9DC128Po7RxH6XMLN48SVks1ag3qYaazCa5dUMG8QnkUaQKtSdRGjaDnFzN39e9HGhD2XtYYG3gGjszmyeUyarGjcHi4fwhJDgjrMjFahK4hGjndiqMPQDaNX9N3EsMwpU1xjTSTrnCAYUxhN39u4DfLNxQTLYBSDdgot8yfEUMBV6UrfvkPAJjaapTK8dUvbiecz31FLVEkn47eCxkNZ3Cw7jLZGmJrHboHusLUFvFBjx1YEVFRB45LzZXph4S7WUpvmq8hnfXUmv7GRzp9azCbQjURDh3foRQWboMDhE4WoNmqwsucneAeHERQL97kd7eiBokQHa1Ntw3tE7hvMRXXXXHd9p5NBzGQ7HVdDSp9S3iuNFkGzEDE7C",
      ValidatorPublicKey:
        "1BpgaZFC5p85ssiGwMiYE8QRv3txAvWxhK6JW1xABA9rCEMJa3GuWZDN15kyAJZS7y8W7JeDXv74REH21FhFFasDVwmX4jeErusPLQmcZCN75iCMDSuQX9ZvKwrhQnvJRaUtdhwN314tJNWgdKrzgsK2U6Vj7hjfuHYRVBuvZaYxRQZYaUBZ3",
      ShardID: 4,
    },
  ],
};

interface Account {
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

interface GenerateAccount {
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
