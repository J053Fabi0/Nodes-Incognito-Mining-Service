import { ObjectId } from "mongo/mod.ts";
import CommonCollection from "./commonCollection.type.ts";

export default interface Client extends CommonCollection {
  name: string;
  account: ObjectId;
  telegram: string;
  role: "admin" | "client";
  isBotBlocked?: boolean;
  lastPayment: Date;
  customSetupFeeUSD?: number;
}
