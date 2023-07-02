import { ObjectId } from "mongo/mod.ts";

/** If the input is an ObjectId object */
export default function isObjectId(id: unknown): id is ObjectId {
  return typeof id === "object" && id instanceof ObjectId;
}
