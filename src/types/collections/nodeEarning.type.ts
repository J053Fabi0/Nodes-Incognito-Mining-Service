import { ObjectId } from "mongo";
import CommonCollection from "./commonCollection.type.ts";

export default interface NodeEarning extends CommonCollection {
  time: Date;
  epoch: number;
  node: ObjectId;
  earning: number;
}
