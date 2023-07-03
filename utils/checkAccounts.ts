import dayjs from "dayjs/mod.ts";
import { ObjectId } from "mongo/mod.ts";
import cryptr from "./cryptrInstance.ts";
import { redis } from "../initDatabase.ts";
import handleError from "./handleError.ts";
import IncognitoCli from "../incognito/IncognitoCli.ts";
import { isLastAccess } from "../types/lastAccess.type.ts";
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
}

/**
 * @param max The maximum number of minutes that the account can be offline
 */
export default async function checkAccounts(maxUnit: number, unit: Unit = Unit.minute) {
  const minutes = maxUnit * unit;

  const accounts = await getAccounts(minutes);
  const accountsViewed: string[] = [];

  for (const accountId of accounts) {
    // check if the account has already been viewed, just in case
    if (accountsViewed.includes(accountId)) continue;

    const account = await getAccount(
      { _id: new ObjectId(accountId) },
      { projection: { privateKey: 1, balance: 1, _id: 1 } }
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

    await updateAccount(privateKey, account._id, account.balance).catch((e) => {
      handleError(e);
      return 0;
    });

    accountsViewed.push(accountId);
  }
}

/**
 *
 * @param privateKey Decrypted private key
 * @param accountId The id of the account to update, from the accounts collection
 * @param currentBalance If given, the balance will be updated only if it's different
 */
export async function updateAccount(privateKey: string, accountId: string | ObjectId, currentBalance?: number) {
  // get the balance
  const incognito = new IncognitoCli(privateKey);
  const balance = await incognito.balanceAccount({ decimalFormat: false });

  // update the balance if it's different
  if (balance === undefined || balance !== currentBalance)
    await changeAccount({ _id: new ObjectId(accountId) }, { $set: { balance } });
}
