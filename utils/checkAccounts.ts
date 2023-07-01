import { ObjectId } from "mongo/mod.ts";
import { redis } from "../initDatabase.ts";
import State from "../types/state.type.ts";
import { aggregateClient } from "../controllers/client.controller.ts";
import cryptr from "./cryptrInstance.ts";
import IncognitoCli from "../incognito/IncognitoCli.ts";
import handleError from "./handleError.ts";
import { changeAccount } from "../controllers/account.controller.ts";

type Account = Required<Pick<State, "prvPrice">> & {
  userId: string;
};

function isStateValid(state: any): state is Account {
  if (!state) return false;
  if (!state.userId) return false;
  if (!state.prvPrice) return false;
  return true;
}

async function getAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];

  // get all the keys
  const keys = await redis.keys("session_*");

  for (const key of keys) {
    const sessionStr = await redis.get(key);

    // delete those keys that are empty
    if (!sessionStr || sessionStr === '{"data":{},"_flash":{}}') {
      await redis.del(key);
      continue;
    }

    try {
      const possibleState: { data?: State } = JSON.parse(sessionStr);

      if (typeof possibleState !== "object" || !possibleState.data) {
        // delete those keys that are not objects or do not have a data property
        await redis.del(key);
        continue;
      }

      // ignore those keys that are not valid
      if (!isStateValid(possibleState.data)) continue;

      accounts.push({
        userId: possibleState.data.userId,
        prvPrice: possibleState.data.prvPrice,
      });
    } catch {
      // delete those keys that are not valid JSON
      await redis.del(key);
      continue;
    }
  }

  return accounts;
}

export default async function checkAccounts() {
  const accounts = await getAccounts();
  const accountsViewed: string[] = [];

  for (const { userId, prvPrice } of accounts) {
    // check if the expiry date has passed
    if (prvPrice.expires < Date.now()) continue;
    // check if the account has already been viewed, just in case
    if (accountsViewed.includes(userId)) continue;

    // get the user's private key
    const accountId = new ObjectId(userId);
    const [{ account }] = (await aggregateClient([
      { $match: { _id: accountId } },
      // populate the user's account
      {
        $lookup: {
          from: "accounts",
          localField: "account",
          foreignField: "_id",
          as: "account",
        },
      },
      // flatten the account array
      { $unwind: "$account" },
      // project the private key and the balance
      { $project: { "account._id": 1, "account.privateKey": 1, "account.balance": 1 } },
    ])) as unknown as [{ account: { privateKey: string; balance: number; _id: ObjectId } }];

    const privateKey = await cryptr.decrypt(account.privateKey);

    // get the balance
    const incognito = new IncognitoCli(privateKey);
    const balance = await incognito.balanceAccount({ decimalFormat: false }).catch((e) => {
      handleError(e);
      return 0;
    });

    // update the balance if it's different
    if (balance !== account.balance) await changeAccount({ _id: account._id }, { $set: { balance } });

    accountsViewed.push(userId);
  }
}
