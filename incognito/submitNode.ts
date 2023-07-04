import {
  saveToRedis,
  getNodeNumber,
  getDockerIndex,
  resolveAndForget,
  sendErrorToClient,
  addSaveToRedisProxy,
  getPendingNodesFromRedis,
} from "./submitNodeUtils.ts";
import { sleep } from "sleep";
import createDockerAndConfigs, {
  addNodeToConfigs,
  CreateDockerAndConfigsReturn,
  CreateDockerAndConfigsOptions,
} from "./createDockerAndConfigs.ts";
import { adminAccount } from "../constants.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import submitTransaction from "./submitTransaction.ts";
import deleteDockerAndConfigs from "./deleteDockerAndConfigs.ts";
import { getClientById } from "../controllers/client.controller.ts";
import { getAccountById } from "../controllers/account.controller.ts";
import { changeNode, getNode } from "../controllers/node.controller.ts";
import EventedArray, { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";
import { AccountTransactionStatus, AccountTransactionType } from "../types/collections/accountTransaction.type.ts";

export interface NewNode extends Omit<CreateDockerAndConfigsOptions, "number" | "inactive"> {
  number?: number;
  /** In PRV. Int format. It MUST NOT have the incognitoFee included. */
  cost: number;
  resolve?: (success: boolean) => void;
}

const MAX_RETRIES = 1;
/** In seconds */
const RETRY_DELAY = 1 * 60;

export const pendingNodes = new EventedArray<NewNode>(
  (
    (working = false) =>
    async ({ array: pending, added }) => {
      if (added)
        for (const newNode of added) {
          await getNodeNumber(newNode);
        }

      saveToRedis();

      if (working) return;
      working = true;

      while (pending.lengthNoEvent > 0)
        try {
          await handleNextPendingNode(pending);
        } catch (e) {
          handleError(e);
          if (pending.lengthNoEvent > 0) await sleep(RETRY_DELAY);
        }

      working = false;
    }
  )()
);
// Add the pending nodes from redis
getPendingNodesFromRedis().then((pending) => pending && pendingNodes.map(addSaveToRedisProxy).push(...pending));

async function handleNextPendingNode(pending: EventedArrayWithoutHandler<NewNode>): Promise<boolean> {
  const [newNode] = pending;
  if (!newNode) return false;

  // Get the client and account
  const client = await getClientById(newNode.clientId, { projection: { account: 1, telegram: 1, _id: 0 } });
  if (!client) {
    handleError(new Error(`Client ${newNode.clientId} not found`));
    return resolveAndForget(newNode, pending, false);
  }

  // check if there's already a node with the same validator key that is active
  const existingNode = await getNode(
    { validator: newNode.validator },
    { projection: { _id: 0, inactive: 1, dockerIndex: 1, number: 1 } }
  );
  if (existingNode && existingNode.inactive === false) {
    sendErrorToClient(client.telegram, `Node with validator key ${newNode.validator} already exists`);
    handleError(new Error(`Node with validator ${newNode.validator} already exists`));
    return resolveAndForget(newNode, pending, false);
  }

  const account = await getAccountById(client.account, { projection: { _id: 0, privateKey: 1 } });
  if (!account) {
    sendErrorToClient(client.telegram);
    handleError(new Error(`Account ${client.account} not found`));
    return resolveAndForget(newNode, pending, false);
  }

  // Get the docker index and set it to the new node if it doesn't have one
  const dockerIndex = await getDockerIndex(newNode, existingNode);
  // same with the node number
  const number = await getNodeNumber(newNode, existingNode);

  // Create the docker and configs, but inactive for the moment.
  const success: false | CreateDockerAndConfigsReturn = await (async () => {
    for (let i = 0; i < MAX_RETRIES; i++)
      try {
        return await createDockerAndConfigs({ ...newNode, number, dockerIndex, inactive: true });
      } catch (e) {
        handleError(e);
        if (i !== MAX_RETRIES - 1) await sleep(RETRY_DELAY);
      }

    return false;
  })();

  // If it couldn't be created, delete the docker and configs, and alert the admin
  if (!success) {
    sendErrorToClient(client.telegram);
    handleError(new Error(`Couldn't create node #${dockerIndex} for client ${newNode.clientId}`));
    await deleteDockerAndConfigs({ dockerIndex, number, clientId: newNode.clientId });
    return resolveAndForget(newNode, pending, false);
  }

  // Charge the client
  const { status } = await submitTransaction(
    {
      maxRetries: 20,
      amount: newNode.cost,
      account: client.account,
      userId: newNode.clientId,
      sendTo: adminAccount.paymentAddress,
      type: AccountTransactionType.EXPENSE,
      details: `Setup fee for node #${newNode.number}`,
      privateKey: await cryptr.decrypt(account.privateKey),
    },
    true // urgent transaction
  );

  // If the transaction failed, delete the docker and configs, and alert the admin and client
  if (status === AccountTransactionStatus.FAILED) {
    sendErrorToClient(client.telegram, `There was a problem charging you for node #${newNode.number}.`);
    handleError(new Error(`Couldn't charge client ${newNode.clientId} for node #${dockerIndex}`));
    await deleteDockerAndConfigs({ dockerIndex, number, clientId: newNode.clientId });
    return resolveAndForget(newNode, pending, false);
  }

  // Activate the node and configs
  await changeNode({ dockerIndex }, { $set: { inactive: false } });
  addNodeToConfigs(dockerIndex, success.name, newNode.validatorPublic);

  return resolveAndForget(newNode, pending, true);
}

export default function submitNode(newNode: Omit<NewNode, "resolve">): Promise<boolean> {
  return new Promise((resolve) => pendingNodes.push(addSaveToRedisProxy({ ...newNode, resolve })));
}
