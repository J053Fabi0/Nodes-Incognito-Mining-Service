import { GrammyError } from "grammy/core/error.ts";

export default function isGrammyError(error: unknown): error is GrammyError {
  return error instanceof GrammyError;
}
