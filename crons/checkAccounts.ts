import dayjs from "dayjs/mod.ts";
import { ObjectId } from "mongo/mod.ts";
import { redis } from "../initDatabase.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import IncognitoCli from "../incognito/IncognitoCli.ts";
import { isLastAccess } from "../types/lastAccess.type.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { getClients } from "../controllers/client.controller.ts";
import { changeAccount, getAccount } from "../controllers/account.controller.ts";

/**
 * Returns all the accounts that are not expired
 * @param maxMinutes The maximum number of minutes that the account can be offline
 */
async function getAccounts(maxMinutes: number): Promise<string[]> {
  const accounts: string[] = [];

  const keys = await redis.keys("last_access_*");
  for (const key of keys) {
    const rawData = await redis.get(key);
    if (!rawData) {
      await redis.del(key);
      continue;
    }

    try {
      const data = JSON.parse(rawData);
      if (!isLastAccess(data)) throw new Error("Invalid data");

      const { date, user } = data;

      const minutesSince = dayjs().diff(date, "minute");

      if (minutesSince <= maxMinutes) accounts.push(user.account);
    } catch {
      // delete the key if it's not a valid JSON
      await redis.del(key);
    }
  }

  return accounts;
}

export enum Unit {
  minute = 1,
  hour = 60,
  day = 60 * 24,
  month = 60 * 24 * 30,
}

/** Check the accounts that have active nodes */
export default async function checkAccounts(): Promise<void>;
/** @param max The maximum number of minutes that the account can be offline */
export default async function checkAccounts(max: number, unit: Unit): Promise<void>;
export default async function checkAccounts(max?: number, unit: Unit = Unit.minute): Promise<void> {
  const accounts: string[] = await (async () => {
    if (max === undefined) {
      const nodes = await getNodes({ inactive: false }, { projection: { _id: 0, client: 1 } });

      const clientsIds: Set<ObjectId> = new Set();
      for (const clientId of nodes.map((node) => node.client)) clientsIds.add(clientId);

      const accountsClient = await getClients(
        { _id: { $in: [...clientsIds] } },
        { projection: { account: 1, _id: 0 } }
      );

      return accountsClient.map((client) => client.account.toString());
    } else {
      const minutes = max * unit;
      return getAccounts(minutes);
    }
  })();

  const accountsViewed: string[] = [];

  for (const accountId of accounts) {
    // check if the account has already been viewed, just in case
    if (accountsViewed.includes(accountId)) continue;

    const account = await getAccount(
      { _id: new ObjectId(accountId) },
      { projection: { privateKey: 1, balance: 1, otaPrivateKey: 1 } }
    );
    if (!account) {
      accountsViewed.push(accountId);
      continue;
    }

    const privateKey = await cryptr.decrypt(account.privateKey).catch((e) => {
      console.error(`Error decrypting the private key of account ${accountId}`, account);
      handleError(e);
      return null;
    });
    if (!privateKey) continue;
    const otakey = await cryptr.decrypt(account.otaPrivateKey).catch((e) => {
      console.error(`Error decrypting the OTA key of account ${accountId}`, account);
      handleError(e);
      return null;
    });
    if (!otakey) continue;

    await updateAccount(privateKey, otakey, accountId, account.balance).catch((e) => {
      handleError(e);
      return 0;
    });

    accountsViewed.push(accountId);
  }
}

/**
 * @param privateKey Decrypted private key
 * @param otaKey Decrypted OTA key
 * @param accountId The id of the account to update, from the accounts collection
 * @param currentBalance If given, the balance will be updated only if it's different */
export async function updateAccount(
  privateKey: string,
  otaKey: string,
  accountId: string | ObjectId,
  currentBalance?: number
) {
  // get the balance
  const incognito = new IncognitoCli(privateKey);
  const balance = await incognito.balanceAccount({ decimalFormat: false, otaKey });

  // update the balance if it's different
  if (balance === undefined || balance !== currentBalance)
    await changeAccount({ _id: new ObjectId(accountId) }, { $set: { balance } });
}
