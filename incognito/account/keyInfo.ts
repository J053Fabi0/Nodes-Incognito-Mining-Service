import { Account } from "./generate.ts";
import IncognitoCli from "../IncognitoCli.ts";

export default async function keyInfo(this: IncognitoCli) {
  if (!this.privateKey) throw new Error("privateKey is not set");

  const args = ["account", "keyinfo", "--privateKey", this.privateKey];

  return JSON.parse(await this.incognitoCli(args)) as Omit<Account, "Index">;
}
