import { redis } from "../initDatabase.ts";
import handleError from "../utils/handleError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import { NewNode, pendingNodes } from "./submitNode.ts";
import { adminTelegramUsername } from "../constants.ts";
import { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";

const redisKey = "newNodes";

/** Resolves the promise and removes the pending node from the array */
export function resolveAndForget<S extends boolean>(
  newNode: NewNode,
  pending: EventedArrayWithoutHandler<NewNode>,
  success: S
): S {
  newNode.resolve?.(success);
  pending.shiftNoEvent();
  saveToRedis();
  return success;
}

/** It will return an array with at least one, else null */
export async function getPendingNodesFromRedis(): Promise<NewNode[] | null> {
  const pendingNodesString = await redis.get(redisKey);
  // if there are no pending nodes in redis, return null
  if (!pendingNodesString) return null;

  try {
    // try to parse it
    const pendingNodesParsed = JSON.parse(pendingNodesString);

    // if it's not an array, delete it and return null
    if (!Array.isArray(pendingNodesParsed)) {
      redis.del(redisKey);
      console.error("Pending nodes in redis is not an array", pendingNodesParsed);
      handleError(new Error("Pending nodes in redis is not an array"));
      return null;
    }

    // only return it if it's not empty
    return pendingNodesParsed.length ? pendingNodesParsed : null;
  } catch (e) {
    // if it can't be parsed, delete it and return null
    redis.del(redisKey);
    handleError(e);
    return null;
  }
}

const defaultMessage = "There was a problem creating your new node.";

export function sendErrorToClient(telegram: string | null, message = defaultMessage) {
  if (telegram) sendMessage(`${message}\n\nPlease contact ${adminTelegramUsername}.`, telegram).catch(handleError);
}

/** Pending nodes */
export async function saveToRedis() {
  await redis.set(redisKey, JSON.stringify(pendingNodes));
}

export function addSaveToRedisProxy<T extends NewNode>(obj: T): T {
  return new Proxy(obj, {
    set(target, name, value) {
      saveToRedis();
      return Reflect.set(target, name, value);
    },
  });
}
