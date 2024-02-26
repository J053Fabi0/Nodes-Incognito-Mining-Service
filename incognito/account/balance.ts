import isError from "../../types/guards/isError.ts";
import IncognitoCli from "../IncognitoCli.ts";

interface BalanceAccount {
  Balance: number;
}

interface Options {
  tokenId?: string;
  /** Default: true */
  decimalFormat?: boolean;
  otaKey?: string;
}

export default async function balanceAccount(this: IncognitoCli, options: Options = {}) {
  if (!this.privateKey) throw new Error("privateKey is not set");

  if (options.decimalFormat === undefined) options.decimalFormat = true;
  if (options.tokenId === undefined) options.tokenId = this.PRV_ID;

  const args = ["account", "balance", "--privateKey", this.privateKey, "--tokenID", options.tokenId];

  const Balance = await (async () => {
    let otaKeySent = false;
    while (true)
      try {
        const { Balance } = JSON.parse(await this.incognitoCli(args)) as BalanceAccount;
        return Balance;
      } catch (e) {
        if (
          isError(e) &&
          !otaKeySent &&
          options.otaKey &&
          e.message.includes("OTA Key") &&
          e.message.includes("not synced")
        ) {
          await this.submitKeyAccount({ otaKey: options.otaKey });
          otaKeySent = true;
        } else throw e;
      }
  })();

  return options.decimalFormat ? Balance / 1e9 : Balance;
}
