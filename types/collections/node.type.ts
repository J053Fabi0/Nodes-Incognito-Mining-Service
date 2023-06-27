import { ObjectId } from "mongo/mod.ts";
import CommonCollection from "./commonCollection.type.ts";

export default interface Node extends CommonCollection {
  name: string;
  number: number;
  client: ObjectId;
  inactive: boolean;
  dockerIndex: number;
  paymentAddress: string;
  validatorPublic: string;
  /** To whom send notifications. This can or cannot include the owner */
  sendTo: ObjectId[];
}
