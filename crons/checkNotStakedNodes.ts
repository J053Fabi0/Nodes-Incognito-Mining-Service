import "humanizer/ordinalize.ts";
import dayjs from "dayjs/mod.ts";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../env.ts";
import handleError from "../utils/handleError.ts";
import relativeTime from "dayjs/plugin/relativeTime.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import { ignore, lastRoles } from "../utils/variables.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { dataDir } from "../incognito/docker/createDocker.ts";
import { getClient } from "../controllers/client.controller.ts";
import { maxNotStakedDays, maxNotStakedDaysForNew } from "../constants.ts";
import deleteDockerAndConfigs from "../incognito/deleteDockerAndConfigs.ts";

dayjs.extend(relativeTime);

const clientsTelegram: Record<string, string | null> = {};

export default async function checkNotStakedNodes() {
  const notStakedNodes = Object.entries(lastRoles)
    .filter(([, { role }]) => role === "NOT_STAKED")
    .map(([dockerIndex]) => dockerIndex);

  // First delete the files of all not-staked nodes
  if (IS_PRODUCTION) await deleteFiles(notStakedNodes);

  // then check if they should be deleted
  await checkAndAlert();
}

async function deleteFiles(notStakedNodes: string[]) {
  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  // Stop all the nodes
  await Promise.allSettled(notStakedNodes.map((dockerindex) => docker(`inc_mainnet_${dockerindex}`, "stop")));

  // Delete their files
  await Promise.allSettled(
    notStakedNodes.map((dockerIndex) => Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true }))
  );

  // Start them
  await Promise.allSettled(notStakedNodes.map((dockerIndex) => docker(`inc_mainnet_${dockerIndex}`, "start")));

  ignore.docker.minutes = lastIgnoreMinutes;
}

async function checkAndAlert() {
  const entries = Object.entries(lastRoles);
  for (const [dockerIndex, { date, role, createdAt, lastWarningDay, client, nodeNumber }] of entries) {
    // only check not staked
    if (role !== "NOT_STAKED") continue;

    const daysSince = dayjs().diff(date, "days");
    const isNew = dayjs().diff(createdAt, "days") <= 30;
    const maxDaysAllowed = isNew ? maxNotStakedDaysForNew : maxNotStakedDays;

    thisIf: if (daysSince > maxDaysAllowed) {
      if (IS_PRODUCTION)
        await deleteDockerAndConfigs({
          clientId: client,
          number: nodeNumber,
          dockerIndex: +dockerIndex,
        });
    } else if ((lastWarningDay ?? -1) < daysSince) {
      // if it's new, give 3 days before giving alerts
      if (isNew && daysSince <= 3) break thisIf;

      const telegramId =
        clientsTelegram[client] ??
        (clientsTelegram[client] = (await getClient(
          { _id: new ObjectId(client) },
          { projection: { _id: 0, telegram: 1 } }
        ))!.telegram);

      if (telegramId) {
        // send it both to the user and the admin
        await sendHTMLMessage(
          `⚠️ Warning ⚠️\n\nYour node <code>${nodeNumber}</code> has been unstaked for ` +
            `${dayjs(date).fromNow(true)}. ` +
            `It'll be deleted in the ${(maxDaysAllowed + 1).ordinalize()} day if it remains unstaked. ` +
            `\nYou'll still be able to host it with us, but the setup fee will be charged again.`,
          telegramId
        ).catch(handleError);
        await sendHTMLMessage(
          `⚠️ Warning ⚠️\n\nDocker <code>${dockerIndex}</code> has been unstaked for ` +
            `${dayjs(date).fromNow(true)}. ` +
            `It'll be deleted in the ${(maxDaysAllowed + 1).ordinalize()} day if it remains unstaked. ` +
            `\nYou'll still be able to host it with us, but the setup fee will be charged again.`,
          telegramId
        ).catch(handleError);
      }
    }
  }
}
