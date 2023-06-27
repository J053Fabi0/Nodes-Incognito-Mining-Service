import { ObjectId } from "mongo/mod.ts";
import CommonCollection from "./commonCollection.type.ts";

export default interface NodeEarning extends CommonCollection {
  time: Date;
  epoch: number;
  node: ObjectId;
  earning: number;
}
