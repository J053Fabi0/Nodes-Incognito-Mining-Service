import IncognitoCli from "../IncognitoCli.ts";

interface BalanceAccount {
  Balance: number;
}

interface Options {
  tokenId?: string;
  /** Default: true */
  decimalFormat?: boolean;
}

export default async function balanceAccount(this: IncognitoCli, options: Options = {}) {
  if (!this.privateKey) throw new Error("privateKey is not set");

  if (options.decimalFormat === undefined) options.decimalFormat = true;
  if (options.tokenId === undefined) options.tokenId = this.PRV_ID;

  const args = ["account", "balance", "--privateKey", this.privateKey, "--tokenID", options.tokenId];

  const { Balance } = JSON.parse(await this.incognitoCli(args)) as BalanceAccount;

  return options.decimalFormat ? Balance / 1e9 : Balance;
}
