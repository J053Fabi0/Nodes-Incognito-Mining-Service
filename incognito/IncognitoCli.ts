import generateAccount from "./generateAccount.ts";
import { binaryWrapper } from "duplicatedFilesCleanerIncognito";

const PRV_ID = "0000000000000000000000000000000000000000000000000000000000000004" as const;

export default class IncognitoCli {
  privateKey?: string;
  incognitoCli = binaryWrapper("incognito-cli");
  PRV_ID = PRV_ID;

  static PRV_ID = PRV_ID;

  constructor(privateKey?: string) {
    this.privateKey = privateKey;
  }

  declare generateAccount: OmitThisParameter<typeof generateAccount>;
}

IncognitoCli.prototype.generateAccount = generateAccount;
