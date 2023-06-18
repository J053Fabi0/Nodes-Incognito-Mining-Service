import { ObjectId } from "mongo";
import CommonCollection from "./commonCollection.type.ts";

export default interface NodeEarning extends CommonCollection {
  node: ObjectId;
  earning: number;
}
