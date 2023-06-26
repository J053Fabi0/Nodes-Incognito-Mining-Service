import IncognitoCli from "../IncognitoCli.ts";

interface BalanceAccount {
  Balance: number;
}

export default async function balanceAccount(this: IncognitoCli, tokenId: string = this.PRV_ID) {
  if (!this.privateKey) throw new Error("privateKey is not set");

  const args = ["account", "balance", "--privateKey", this.privateKey, "--tokenID", tokenId];

  const { Balance } = JSON.parse(await this.incognitoCli(args)) as BalanceAccount;

  return Balance;
}
