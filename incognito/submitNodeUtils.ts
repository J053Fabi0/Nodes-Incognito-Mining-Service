import { NewNode } from "./submitNode.ts";
import handleError from "../utils/handleError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import { adminTelegramUsername } from "../constants.ts";
import { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";

/** Resolves the promise and removes the pending node from the array */
export function resolveAndForget<S extends boolean>(
  newNode: NewNode,
  pending: EventedArrayWithoutHandler<NewNode>,
  success: S
): S {
  newNode.resolve?.(success);
  pending.shiftNoEvent();
  return success;
}

const defaultMessage = "There was a problem creating your new node.";

export function sendErrorToClient(telegram: string | null, message = defaultMessage) {
  if (telegram) sendMessage(`${message}\n\nPlease contact ${adminTelegramUsername}.`, telegram).catch(handleError);
}
