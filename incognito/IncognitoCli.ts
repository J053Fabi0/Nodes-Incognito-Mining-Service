import send from "./account/send.ts";
import keyInfo from "./account/keyInfo.ts";
import balanceAccount from "./account/balance.ts";
import generateAccount from "./account/generate.ts";
import { join, fromFileUrl } from "std/path/mod.ts";
import submitKeyAccount from "./account/submitKey.ts";
import { binaryWrapper } from "duplicatedFilesCleanerIncognito";

const PRV_ID = "0000000000000000000000000000000000000000000000000000000000000004" as const;

export default class IncognitoCli {
  PRV_ID = PRV_ID;
  privateKey?: string;
  incognitoCli = binaryWrapper(join(fromFileUrl(import.meta.url), "..", "incognito-cli"));

  static PRV_ID = PRV_ID;
  static incognitoCli = binaryWrapper(join(fromFileUrl(import.meta.url), "..", "incognito-cli"));
  static validatorKeyRegex = /[a-z0-9A-Z]{49,51}/;
  static validatorPublicKeyRegex = /[a-z0-9A-Z]{180,181}/;
  static paymentAddressRegex = /[a-z0-9A-Z]{148}/;

  constructor(privateKey?: string) {
    this.privateKey = privateKey;
  }

  declare generateAccount: OmitThisParameter<typeof generateAccount>;
  // @ts-expect-error - This works
  static generateAccount = generateAccount.bind(IncognitoCli);

  declare balanceAccount: OmitThisParameter<typeof balanceAccount>;

  /**
   * This command submits an otaKey to the full-node to use the full-node's cache.
   * If an access token is provided, it will submit the ota key in an authorized manner.
   * See https://github.com/incognitochain/go-incognito-sdk-v2/blob/master/tutorials/docs/accounts/submit_key.md for more details.
   */
  declare submitKeyAccount: OmitThisParameter<typeof submitKeyAccount>;
  /**
   * This command submits an otaKey to the full-node to use the full-node's cache.
   * If an access token is provided, it will submit the ota key in an authorized manner.
   * See https://github.com/incognitochain/go-incognito-sdk-v2/blob/master/tutorials/docs/accounts/submit_key.md for more details.
   */
  // @ts-expect-error - This works
  static submitKeyAccount = submitKeyAccount.bind(IncognitoCli);

  /** Print all related-keys of a private key. */
  declare keyInfo: OmitThisParameter<typeof keyInfo>;

  /**
   * This command sends an amount of PRV or token from one wallet to another wallet. By default, it used 100 nano PRVs to pay the transaction fee.
   * @returns The transaction hash or null if there was an error parsing the response, but the transaction may have been sent.
   */
  declare send: OmitThisParameter<typeof send>;

  static isValidatorKey(key: string) {
    return IncognitoCli.validatorKeyRegex.test(key);
  }

  static isValidatorPublicKey(key: string) {
    return IncognitoCli.validatorPublicKeyRegex.test(key);
  }

  static isPaymentAddress(key: string) {
    return IncognitoCli.paymentAddressRegex.test(key);
  }
}

IncognitoCli.prototype.balanceAccount = balanceAccount;
IncognitoCli.prototype.generateAccount = generateAccount;
IncognitoCli.prototype.submitKeyAccount = submitKeyAccount;
IncognitoCli.prototype.keyInfo = keyInfo;
IncognitoCli.prototype.send = send;
