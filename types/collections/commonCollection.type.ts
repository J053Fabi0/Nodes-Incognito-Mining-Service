import { ObjectId } from "mongo/mod.ts";

export default interface CommonCollection {
  _id: ObjectId;
  createdAt: Date;
  modifiedAt: Date;
}
