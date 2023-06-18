import { ObjectId } from "mongo";
import handleError from "./utils/handleError.ts";
import sendMessage from "./telegram/sendMessage.ts";
import { prvDecimalsDivisor } from "../constants.ts";
import getNodesStatus from "./utils/getNodesStatus.ts";
import uploadToNotion from "./notion/uploadToNotion.ts";
import Client from "./types/collections/client.type.ts";
import getNodeEarnings from "./utils/getNodeEarnings.ts";
import { getNodes } from "./controllers/node.controller.ts";
import { getClients } from "./controllers/client.controller.ts";
import { repeatUntilNoError } from "duplicatedFilesCleanerIncognito";
import { getNodeEarning } from "./controllers/nodeEarning.controller.ts";
import { sleep } from "sleep";

function repeatUntilNoError55<T>(cb: (() => T) | (() => Promise<T>)) {
  return repeatUntilNoError<T>(cb, 5, 5);
}

function findClientById(clients: Client[], id: ObjectId) {
  return clients.find((c) => `${c._id}` === `${id}`)!;
}

export default async function checkEarnings() {
  while (true) {
    try {
      const nodes = await getNodes();
      const clients = await getClients();

      // Get nodes status
      const nodesStatus = await getNodesStatus();

      for (const nodeStatus of nodesStatus) {
        const {
          _id,
          name,
          sendTo,
          number,
          validatorPublic,
          client: clientId,
        } = nodes.find((n) => n.validatorPublic === nodeStatus.validatorPublic)!;

        const client = findClientById(clients, clientId);

        const nodeEarnings = await getNodeEarnings(validatorPublic);

        for (const nodeEarning of nodeEarnings) {
          const { epoch, reward, time } = nodeEarning;

          // If no earing, continue.
          if (!reward) continue;
          // If the earning is alredy registered, continue.
          if (await getNodeEarning({ node: _id, epoch })) continue;

          if (client.notionPage)
            await repeatUntilNoError55(() =>
              uploadToNotion(client.notionPage!, epoch, new Date(time), reward / prvDecimalsDivisor, number)
            );

          // Send messages to the destination users
          for (const sendToId of sendTo) {
            const { telegram } = findClientById(clients, sendToId);
            if (telegram)
              await repeatUntilNoError55(() =>
                sendMessage(
                  `#${name} - <code>${reward / prvDecimalsDivisor}</code>.\n` +
                    `Epoch: <code>${epoch}</code>.\n` +
                    `To come: <code>${nodeStatus.epochsToNextEvent}</code>.`,
                  telegram,
                  { parse_mode: "HTML" }
                )
              );
          }
        }
      }
    } catch (e) {
      handleError(e);
    } finally {
      await sleep(60 * 5); // 5 minutes
    }
  }
}
