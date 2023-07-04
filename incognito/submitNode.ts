import {
  saveToRedis,
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
import { ObjectId } from "mongo/mod.ts";
import cryptr from "../utils/cryptrInstance.ts";
import { adminAccount } from "../constants.ts";
import handleError from "../utils/handleError.ts";
import submitTransaction from "./submitTransaction.ts";
import deleteDockerAndConfigs from "./deleteDockerAndConfigs.ts";
import { getClientById } from "../controllers/client.controller.ts";
import { getAccountById } from "../controllers/account.controller.ts";
import { changeNode, getNodes } from "../controllers/node.controller.ts";
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
    async ({ array: pending }) => {
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
getPendingNodesFromRedis().then((pending) => pending && pendingNodes.push(...pending));

async function handleNextPendingNode(pending: EventedArrayWithoutHandler<NewNode>): Promise<boolean> {
  const [newNode] = pending;
  if (!newNode) return false;

  // Get the client and account
  const client = await getClientById(newNode.clientId);
  if (!client) {
    handleError(new Error(`Client ${newNode.clientId} not found`));
    return resolveAndForget(newNode, pending, false);
  }
  const account = await getAccountById(client.account);
  if (!account) {
    sendErrorToClient(client.telegram);
    handleError(new Error(`Account ${client.account} not found`));
    return resolveAndForget(newNode, pending, false);
  }

  // Get the docker index and set it to the new node if it doesn't have one
  const dockerIndex =
    newNode.dockerIndex ??
    (newNode.dockerIndex =
      Math.max(
        ...(await getNodes({}, { projection: { _id: 0, dockerIndex: 1 } })).map((d) => d.dockerIndex),
        -1 // will become 0
      ) + 1);
  // same with the node number
  const number =
    newNode.number ??
    (newNode.number =
      Math.max(
        ...(await getNodes({ client: new ObjectId(newNode.clientId) }, { projection: { _id: 0, number: 1 } })).map(
          (d) => d.number
        ),
        0 // will become 1
      ) + 1);

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
    await deleteDockerAndConfigs({ dockerIndex, number: newNode.number, clientId: newNode.clientId });
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
    await deleteDockerAndConfigs({ dockerIndex, number: newNode.number, clientId: newNode.clientId });
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
