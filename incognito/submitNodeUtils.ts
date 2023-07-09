import { ObjectId } from "mongo/mod.ts";
import { redis } from "../initDatabase.ts";
import handleError from "../utils/handleError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import Node from "../types/collections/node.type.ts";
import { NewNode, pendingNodes } from "./submitNode.ts";
import { adminTelegramUsername } from "../constants.ts";
import { getNode, getNodes } from "../controllers/node.controller.ts";
import { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";

const redisKey = "pendingNodes";

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

/** It returns the saved data or fetches and sets the data */
export async function getNodeNumber(
  newNode: NewNode,
  existingNode?: Pick<Node, "number"> | null
): Promise<number> {
  existingNode =
    existingNode ?? (await getNode({ validator: newNode.validator }, { projection: { _id: 0, number: 1 } }));
  if (existingNode) return (newNode.number = existingNode.number);

  if (typeof newNode.number === "number") return newNode.number;

  return (newNode.number =
    Math.max(
      ...(await getNodes({ client: new ObjectId(newNode.clientId) }, { projection: { _id: 0, number: 1 } })).map(
        (d) => d.number
      ),
      0 // will become 1
    ) + 1);
}

export async function getDockerIndex(
  newNode: NewNode,
  existingNode?: Pick<Node, "dockerIndex"> | null
): Promise<number> {
  existingNode =
    existingNode ?? (await getNode({ validator: newNode.validator }, { projection: { _id: 0, dockerIndex: 1 } }));
  if (existingNode) return (newNode.dockerIndex = existingNode.dockerIndex);

  if (typeof newNode.dockerIndex === "number") return newNode.dockerIndex;

  return (newNode.dockerIndex =
    Math.max(
      ...(
        await getNodes({ client: new ObjectId(newNode.clientId) }, { projection: { _id: 0, dockerIndex: 1 } })
      ).map((d) => d.dockerIndex),
      -1 // will become 0
    ) + 1);
}
