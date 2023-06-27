import { MongoServerError } from "mongo/src/error.ts";

export default function isMongoServerError(e: unknown): e is MongoServerError {
  return e instanceof MongoServerError;
}
