import { ObjectId } from "mongo";
import CommonCollection from "./commonCollection.type.ts";

export default interface NodeEarning extends CommonCollection {
  epoch: number;
  node: ObjectId;
  earning: number;
}
