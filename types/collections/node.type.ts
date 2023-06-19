import { ObjectId } from "mongo";
import CommonCollection from "./commonCollection.type.ts";

export default interface Node extends CommonCollection {
  name: string;
  /**
   * Its identifier for the tables
   * @deprecated Use name instead
   */
  number: number;
  client: ObjectId;
  dockerIndex: number;
  validatorPublic: string;
  paymentAddress: string;
  /** To whom send notifications. This can or cannot include the owner */
  sendTo: ObjectId[];
}
