import { ObjectId } from "mongo/mod.ts";
import { adminTelegram } from "../constants.ts";
import handleError from "../utils/handleError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import Client from "../types/collections/client.type.ts";
import getNodeEarnings from "../utils/getNodeEarnings.ts";
import { moveDecimalDot } from "../utils/numbersString.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { getClients } from "../controllers/client.controller.ts";
import { createNodeEarning } from "../controllers/nodeEarning.controller.ts";

function findClientById(clients: Pick<Client, "_id" | "telegram">[], id: ObjectId) {
  return clients.find((c) => `${c._id}` === `${id}`)!;
}

export default async function checkEarnings() {
  const nodes = await getNodes(
    { inactive: false },
    { projection: { name: 1, sendTo: 1, number: 1, client: 1, validatorPublic: 1, epoch: 1, _id: 1 } }
  );
  const clients = await getClients({}, { projection: { telegram: 1, _id: 1 } });

  // Get nodes status
  const nodesStatus = await getNodesStatus();

  for (const nodeStatus of nodesStatus) {
    const node = nodes.find((n) => n.validatorPublic === nodeStatus.validatorPublic)!;
    if (!node) continue;
    const { _id, sendTo, number, client, validatorPublic } = node;

    const nodeEarnings = await getNodeEarnings(validatorPublic);

    for (const nodeEarning of nodeEarnings) {
      const { epoch, earning } = nodeEarning;

      // If no earing yet, continue.
      if (!earning) continue;

      // If the earning's epoch is lower or equal than the node's epoch, continue.
      // This is to avoid registering earnings that we have not mined.
      if (epoch <= node.epoch) continue;

      const time = new Date(nodeEarning.time);

      const created = await createNodeEarning({
        time,
        epoch,
        earning,
        node: _id,
      }).catch(() => false as false);
      // If the earning was alredy registered, continue.
      if (created === false) continue;

      // Send messages to the destination users
      for (const sendToId of sendTo) {
        const { telegram } = findClientById(clients, sendToId);
        if (telegram) {
          const isAdmin = telegram === adminTelegram;
          sendMessage(
            `Node <code>#${number}${isAdmin ? ` ${client}` : ""}</code>.\n` +
              `Earned: <code>${moveDecimalDot(earning, -9)}</code>.\n` +
              `Epoch: <code>${epoch}</code>.\n` +
              `To come: <code>${nodeStatus.epochsToNextEvent}</code>.`,
            telegram,
            { parse_mode: "HTML" },
            "notificationsBot"
          ).catch(handleError);
        }
      }
    }
  }
}
