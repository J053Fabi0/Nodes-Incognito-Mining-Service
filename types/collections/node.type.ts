import { ObjectId } from "mongo/mod.ts";
import CommonCollection from "./commonCollection.type.ts";

/** Incognito Node */
export default interface Node extends CommonCollection {
  name: string;
  number: number;
  client: ObjectId;
  inactive: boolean;
  /** miningKey */
  validator: string;
  dockerIndex: number;
  validatorPublic: string;
  /** To whom send notifications. This can or cannot include the owner */
  sendTo: ObjectId[];
  rcpPort: number;
  /** The latest epoch at the time of creation */
  epoch: number;
  dockerTag: string;
}
