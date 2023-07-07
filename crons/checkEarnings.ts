import { ObjectId } from "mongo/mod.ts";
import { adminTelegram } from "../constants.ts";
import handleError from "../utils/handleError.ts";
import sendMessage from "../telegram/sendMessage.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import uploadToNotion from "../notion/uploadToNotion.ts";
import Client from "../types/collections/client.type.ts";
import getNodeEarnings from "../utils/getNodeEarnings.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { getClients } from "../controllers/client.controller.ts";
import { repeatUntilNoError } from "duplicatedFilesCleanerIncognito";
import { createNodeEarning, deleteNodeEarning } from "../controllers/nodeEarning.controller.ts";

function findClientById(clients: Pick<Client, "_id" | "notionPage" | "telegram">[], id: ObjectId) {
  return clients.find((c) => `${c._id}` === `${id}`)!;
}

export default async function checkEarnings() {
  const nodes = await getNodes(
    { inactive: false },
    { projection: { name: 1, sendTo: 1, number: 1, client: 1, validatorPublic: 1, _id: 1 } }
  );
  const clients = await getClients({}, { projection: { telegram: 1, notionPage: 1, _id: 1 } });

  // Get nodes status
  const nodesStatus = await getNodesStatus();

  for (const nodeStatus of nodesStatus) {
    const { _id, sendTo, number, validatorPublic, client } = nodes.find(
      (n) => n.validatorPublic === nodeStatus.validatorPublic
    )!;

    const { notionPage } = findClientById(clients, client);
    const nodeEarnings = await getNodeEarnings(validatorPublic);

    for (const nodeEarning of nodeEarnings) {
      const { epoch, earning } = nodeEarning;

      // If no earing yet, continue.
      if (!earning) continue;

      const time = new Date(nodeEarning.time);

      const created = await createNodeEarning({
        time,
        epoch,
        node: _id,
        earning: earning / 1e9,
      }).catch(() => false as false);
      // If the earning was alredy registered, continue.
      if (created === false) continue;

      if (notionPage)
        try {
          await repeatUntilNoError(() => uploadToNotion(notionPage, epoch, time, earning / 1e9, number), 20, 5);
        } catch (e) {
          handleError(e);
          await deleteNodeEarning({ _id: created._id });
          continue;
        }

      // Send messages to the destination users
      for (const sendToId of sendTo) {
        const { telegram } = findClientById(clients, sendToId);
        if (telegram) {
          const isAdmin = telegram === adminTelegram;
          sendMessage(
            `Node <code>#${number}${isAdmin ? ` ${client}` : ""}</code>.\n` +
              `Earned: <code>${earning / 1e9}</code>.\n` +
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
