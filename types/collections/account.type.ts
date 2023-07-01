import CommonCollection from "./commonCollection.type.ts";

/**
 * Incognito account
 */
export default interface Account extends CommonCollection {
  /** Encrypted */
  mnemonic: string;
  /** Encrypted */
  privateKey: string;
  publicKey: string;
  paymentAddressV1: string;
  paymentAddress: string;
  /** Encrypted */
  readOnlyKey: string;
  /** Encrypted */
  otaPrivateKey: string;
  miningKey: string;
  miningPublicKey: string;
  validatorPublicKey: string;
  shardID: number;
  /** Int format, not decimal */
  balance: number;
}
