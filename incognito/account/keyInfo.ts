import IncognitoCli from "../IncognitoCli.ts";
import { Account, CapAccount } from "./generate.ts";

export default async function keyInfo(this: IncognitoCli): Promise<Omit<Account, "index">> {
  if (!this.privateKey) throw new Error("privateKey is not set");

  const args = ["account", "keyinfo", "--privateKey", this.privateKey];

  const a = JSON.parse(await this.incognitoCli(args)) as Omit<CapAccount, "Index">;

  return {
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
  };
}
