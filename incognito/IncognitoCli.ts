import generateAccount from "./generateAccount.ts";
import { binaryWrapper } from "duplicatedFilesCleanerIncognito";

export default class IncognitoCli {
  privateKey?: string;
  incognitoCli = binaryWrapper("incognito-cli");

  constructor(privateKey?: string) {
    this.privateKey = privateKey;
  }

  declare generateAccount: OmitThisParameter<typeof generateAccount>;
}

IncognitoCli.prototype.generateAccount = generateAccount;
