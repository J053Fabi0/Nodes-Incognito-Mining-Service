import { ObjectId } from "mongo";

export default interface CommonCollection {
  _id: ObjectId;
  createdAt: Date;
  modifiedAt: Date;
}
