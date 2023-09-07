import "humanizer/ordinalize.ts";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../env.ts";
import setCache from "../utils/setCache.ts";
import handleError from "../utils/handleError.ts";
import relativeTime from "dayjs/plugin/relativeTime.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { getClient } from "../controllers/client.controller.ts";
import { maxNotStakedDays, maxNotStakedDaysForNew } from "../constants.ts";
import deleteDockerAndConfigs from "../incognito/deleteDockerAndConfigs.ts";
import { ignore, lastRoles, monitorInfoByDockerIndex } from "../utils/variables.ts";
import { dataDir } from "../controller/controllers/createNode/docker/createDocker.ts";

dayjs.extend(relativeTime);
dayjs.extend(utc);

const clientsTelegram: Record<string, string | null> = {};

export default async function checkNotStakedNodes() {
  const notStakedNodes = Object.entries(lastRoles)
    .filter(([, { role }]) => role === "NOT_STAKED")
    .map(([dockerIndex]) => dockerIndex);

  // delete lastWarningDay and removeOnDate from other nodes
  const otherNodes = Object.entries(lastRoles)
    .filter(([, { role }]) => role !== "NOT_STAKED")
    .map(([, data]) => data);
  for (const data of otherNodes) {
    delete data.lastWarningDay;
    delete data.removeOnDate;
  }

  // First delete the files of all not-staked nodes
  if (IS_PRODUCTION) await deleteFiles(notStakedNodes);

  // then check if they should be deleted
  await checkAndAlert();
}

async function deleteFiles(notStakedNodes: string[]) {
  // Save the current docker ignore value and set it to Infinity to ignore dockers until the process is done
  const lastIgnoreMinutes = ignore.docker.minutes;
  ignore.docker.minutes = Infinity;

  const nodesOnline = notStakedNodes.filter((dockerIndex) =>
    Boolean(monitorInfoByDockerIndex[dockerIndex]?.nodeInfo.docker.running)
  );

  // Stop all the nodes
  for (const node of nodesOnline) setCache(node, "docker.running", false);
  await Promise.allSettled(nodesOnline.map((dockerIndex) => docker(`inc_mainnet_${dockerIndex}`, "stop")));
  for (const node of nodesOnline) setCache(node, "docker.running", false);

  // Delete their files
  await Promise.allSettled(
    notStakedNodes.map((dockerIndex) => Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true }))
  );

  // Start them
  for (const node of nodesOnline) setCache(node, "docker.running", true);
  await Promise.allSettled(nodesOnline.map((dockerIndex) => docker(`inc_mainnet_${dockerIndex}`, "start")));
  for (const node of nodesOnline) setCache(node, "docker.running", true);

  ignore.docker.minutes = lastIgnoreMinutes;
}

async function checkAndAlert() {
  const entries = Object.entries(lastRoles);
  for (const [dockerIndex, data] of entries) {
    const { date, role, createdAt, lastWarningDay, client, nodeNumber } = data;

    // only check not staked
    if (role !== "NOT_STAKED") continue;

    const daysSince = dayjs().diff(date, "days");
    const isNew = dayjs().diff(createdAt, "days") <= 30;

    const removeOnDate =
      data.removeOnDate ??
      (data.removeOnDate = dayjs(date)
        .utc()
        .add(isNew ? maxNotStakedDaysForNew : maxNotStakedDays, "day")
        .add(1, "day")
        .startOf("day")
        .valueOf());
    const dayToDelete = dayjs(removeOnDate).diff(date, "days");

    thisIf: if (removeOnDate < Date.now()) {
      if (IS_PRODUCTION)
        await deleteDockerAndConfigs({
          clientId: client,
          number: nodeNumber,
          dockerIndex: +dockerIndex,
        });
      else console.log("Would delete", dockerIndex);
    } else if ((lastWarningDay ?? -Infinity) < daysSince) {
      // if it's new, give 3 days before giving alerts
      if (isNew && daysSince <= 3) break thisIf;

      const telegramId =
        clientsTelegram[client] ??
        (clientsTelegram[client] = (await getClient(
          { _id: new ObjectId(client) },
          { projection: { _id: 0, telegram: 1 } }
        ))!.telegram);

      if (telegramId) {
        data.lastWarningDay = daysSince;

        // send it both to the user and the admin
        await sendHTMLMessage(
          `⚠️ Warning ⚠️\n\nYour node <code>${nodeNumber}</code> has been unstaked for ` +
            `${dayjs(date).fromNow(true)}. ` +
            `It'll be deleted in the ${dayToDelete.ordinalize()} day if it remains unstaked. ` +
            `\nYou'll still be able to host it with us, but the setup fee will be charged again.`,
          telegramId,
          undefined,
          "notificationsBot"
        ).catch(handleError);

        await sendHTMLMessage(
          `⚠️ Warning ⚠️\n\nDocker <code>${dockerIndex}</code> has been unstaked for ` +
            `${dayjs(date).fromNow(true)}. ` +
            `It'll be deleted in the ${dayToDelete.ordinalize()} day if it remains unstaked. ` +
            `\nYou'll still be able to host it with us, but the setup fee will be charged again.`,
          telegramId,
          undefined,
          "notificationsBot"
        ).catch(handleError);
      }
    }
  }
}
