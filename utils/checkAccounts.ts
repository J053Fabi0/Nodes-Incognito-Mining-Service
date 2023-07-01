import { ObjectId } from "mongo/mod.ts";
import cryptr from "./cryptrInstance.ts";
import { redis } from "../initDatabase.ts";
import State from "../types/state.type.ts";
import handleError from "./handleError.ts";
import IncognitoCli from "../incognito/IncognitoCli.ts";
import { changeAccount } from "../controllers/account.controller.ts";
import { aggregateClient } from "../controllers/client.controller.ts";

type Account = Required<Pick<State, "prvPrice">> & {
  userId: string;
};

function isStateValid(state: unknown, checkPrvPrice: boolean): state is Account {
  if (!state || typeof state !== "object") return false;
  if (!("userId" in state)) return false;
  if (checkPrvPrice && !("prvPrice" in state)) return false;
  return true;
}

async function getAccounts<
  IgnorePrvprice extends boolean,
  Return extends IgnorePrvprice extends false ? Account : Omit<Account, "prvPrice"> & { prvPrice: undefined }
>(ignorePrvPrice: IgnorePrvprice): Promise<Return[]> {
  const accounts: Return[] = [];

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
      if (!isStateValid(possibleState.data, ignorePrvPrice)) continue;

      accounts.push({
        userId: possibleState.data.userId,
        prvPrice: ignorePrvPrice ? undefined : possibleState.data.prvPrice,
      } as Return);
    } catch {
      // delete those keys that are not valid JSON
      await redis.del(key);
      continue;
    }
  }

  return accounts;
}

/**
 * @param checkAll Check regardless of the expiry date
 */
export default async function checkAccounts(checkAll: boolean) {
  const accounts = await getAccounts(checkAll);
  const accountsViewed: string[] = [];

  for (const { userId, prvPrice } of accounts) {
    // check if the expiry date has passed and we don't want to check all
    if (!checkAll && prvPrice && prvPrice.expires < Date.now()) continue;
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

    const privateKey = await cryptr.decrypt(account.privateKey).catch((e) => {
      console.log(`Error decrypting the private key of the user ${userId}`, account);
      handleError(e);
      return null;
    });
    if (!privateKey) continue;

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
