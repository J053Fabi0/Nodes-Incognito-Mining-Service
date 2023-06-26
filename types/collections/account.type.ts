import CommonCollection from "./commonCollection.type.ts";

/**
 * Incognito account
 */
export default interface Account extends CommonCollection {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  paymentAddressV1: string;
  paymentAddress: string;
  readOnlyKey: string;
  otaPrivateKey: string;
  miningKey: string;
  miningPublicKey: string;
  validatorPublicKey: string;
  shardID: number;
}
