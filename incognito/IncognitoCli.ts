import keyInfo from "./account/keyInfo.ts";
import balanceAccount from "./account/balance.ts";
import generateAccount from "./account/generate.ts";
import submitKeyAccount from "./account/submitKey.ts";
import { binaryWrapper } from "duplicatedFilesCleanerIncognito";

const PRV_ID = "0000000000000000000000000000000000000000000000000000000000000004" as const;

export default class IncognitoCli {
  PRV_ID = PRV_ID;
  privateKey?: string;
  incognitoCli = binaryWrapper("incognito-cli");

  static PRV_ID = PRV_ID;
  static incognitoCli = binaryWrapper("incognito-cli");

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

  static isValidatorKey(key: string) {
    return /[a-z0-9A-Z]{49,51}/.test(key);
  }

  static isValidatorPublicKey(key: string) {
    return /[a-z0-9A-Z]{180,181}/.test(key);
  }
}

IncognitoCli.prototype.balanceAccount = balanceAccount;
IncognitoCli.prototype.generateAccount = generateAccount;
IncognitoCli.prototype.submitKeyAccount = submitKeyAccount;
IncognitoCli.prototype.keyInfo = keyInfo;
