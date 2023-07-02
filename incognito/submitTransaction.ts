import {
  changeAccountTransaction,
  createAccountTransaction,
  getAccountTransactions,
} from "../controllers/accountTransaction.controller.ts";
import { sleep } from "sleep";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../env.ts";
import { redis } from "../initDatabase.ts";
import IncognitoCli from "./IncognitoCli.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import { incognitoFeeInt } from "../constants.ts";
import { moveDecimalDot } from "../utils/numbersString.ts";
import { getClient } from "../controllers/client.controller.ts";
import { changeAccount, getAccount } from "../controllers/account.controller.ts";
import EventedArray, { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";
import { AccountTransactionStatus, AccountTransactionType } from "../types/collections/accountTransaction.type.ts";

const MAX_RETRIES = 5;
/** In seconds */
const RETRY_DELAY = 1 * 60;

interface Result {
  /** If it's null, the result couldn't be parsed, but the transaction may have been done anyway */
  txHash: string | null;
  retries: PendingTransaction["retries"];
  status: AccountTransactionStatus.COMPLETED | AccountTransactionStatus.FAILED;
  errorDetails?: string;
}

export interface PendingTransaction {
  type: AccountTransactionType.EXPENSE | AccountTransactionType.WITHDRAWAL;
  /** Int format. It doesn't include the fee */
  amount: number;
  /** Int format. If not provided, defaults to `incognitoFeeInt` */
  fee?: number;
  /** Payment address */
  sendTo: string;
  account: ObjectId | string;
  privateKey: string;
  /** The owner of the account */
  userId: ObjectId | string;
  /** Timestamps of the dates in which it has been tried */
  retries: number[];
  /** Defaults to MAX_RETRIES */
  maxRetries?: number;
  /** Defaults to RETRY_DELAY. In seconds */
  retryDelay?: number;
  resolve?: (result: Result) => void;
  /** If you have uploaded the transaction. If not, it'll be uploaded automatically to the DB */
  transactionId?: ObjectId | string;
  /** The balance of the account. If not given, it'll be retrieved from the DB */
  balance?: number;
  /** Timestamp */
  createdAt: number;
  details?: string;
}

/**
 * It uploads the transaction to the DB, updates the account's balance, set the
 * transaction to error if the balance is not enough, removes the transaction form the array
 * @returns True if the balance is enough, false if not
 */
async function checkBalance(
  transaction: PendingTransaction,
  pending: EventedArrayWithoutHandler<PendingTransaction>
): Promise<boolean> {
  // create the transaction if it doesn't exist
  if (!transaction.transactionId) {
    const { _id } = await createAccountTransaction({
      txHash: null,
      errorDetails: null,
      fee: transaction.fee!,
      type: transaction.type,
      amount: transaction.amount,
      sendTo: transaction.sendTo,
      details: transaction.details || null,
      status: AccountTransactionStatus.PENDING,
      account: new ObjectId(transaction.account),
      createdAt: new Date(transaction.createdAt),
      retries: transaction.retries.map((r) => new Date(r)),
    });
    transaction.transactionId = _id;
  }

  const total = transaction.amount + transaction.fee!;

  // get the account's balance
  const balance: number =
    transaction.balance ??
    (transaction.balance = (await getAccount(
      { _id: new ObjectId(transaction.account) },
      { projection: { balance: 1, _id: 0 } }
    ))!.balance);

  // if the balance is not enough
  if (balance < total) {
    // if so, update the transaction to failed
    const errorDetails =
      `Balance not enough. You have ${moveDecimalDot(balance, -9)} PRV ` +
      `but you need ${moveDecimalDot(total, -9)} PRV`;

    await changeAccountTransaction(
      { _id: new ObjectId(transaction.transactionId) },
      { $set: { status: AccountTransactionStatus.FAILED, errorDetails } }
    );

    // remove it from the array
    const index = pending.indexOf(transaction);
    if (index !== -1) pending.spliceNoEvent(index, 1);
    saveToRedis();

    // resolve the promise
    transaction.resolve?.({
      txHash: null,
      errorDetails,
      retries: transaction.retries,
      status: AccountTransactionStatus.FAILED,
    });

    return false;
  } else {
    // decrese the account's balance by the total
    await changeAccount({ _id: new ObjectId(transaction.account) }, { $inc: { balance: -total } });

    return true;
  }
}

/**
 * This is a true record that can never return undefined
 * You can push a new transaction to this array and it'll be executed automatically.
 * But its better to use the function `submitTransaction` instead.
 * @key account id, not client id
 */
export const pendingTransactionsByAccount = new Proxy<Record<string, EventedArray<PendingTransaction>>>(
  {},
  {
    get(target, name: string) {
      if (name in target) return target[name];

      // If the array for this account doesn't exist, create it
      return (target[name] = new EventedArray<PendingTransaction>(
        // create a closure for the variable working
        (
          (working = false) =>
          async ({ array: pending, added }) => {
            // add missing fields and check the balance
            if (added) {
              for (const transaction of added) {
                if (transaction.fee === undefined) transaction.fee = incognitoFeeInt;
                await checkBalance(transaction, pending);
              }
            }

            saveToRedis();

            if (!working) {
              working = true;

              // Resolve all the pending transactions.
              while (pending.lengths > 0) {
                // get the first transaction
                const transaction = pending[0];
                if (!transaction) continue;

                // execute the transaction
                let txHash: string | undefined | null;
                {
                  const cli = new IncognitoCli(transaction.privateKey);
                  let i = 0;
                  do {
                    try {
                      if (IS_PRODUCTION) {
                        txHash = await cli.send(transaction.sendTo, transaction.amount);
                      } else {
                        txHash = await new Promise((r) => setTimeout(() => r("txHash_" + Math.random()), 3_000));
                      }
                    } catch (e) {
                      handleError(e);
                      transaction.retries.push(Date.now());
                      await sleep(transaction.retryDelay ?? RETRY_DELAY);
                    }
                  } while (txHash === undefined || i++ < (transaction.maxRetries ?? MAX_RETRIES));
                }

                // update the transaction
                const status = txHash ? AccountTransactionStatus.COMPLETED : AccountTransactionStatus.FAILED;
                await changeAccountTransaction(
                  { _id: new ObjectId(transaction.transactionId!) },
                  {
                    $set: {
                      txHash,
                      status,
                      retries: transaction.retries.map((r) => new Date(r)),
                    },
                  }
                );

                // remove it from the array
                pending.shiftNoEvent();
                saveToRedis();

                // resolve the promise
                transaction.resolve?.({ status, txHash: txHash, retries: transaction.retries });
              }

              working = false;
            }
          }
        )()
      ));
    },
  }
);

export default function submitTransaction(
  params: Omit<PendingTransaction, "resolve" | "retries" | "createdAt"> &
    Partial<Pick<PendingTransaction, "createdAt">>
): Promise<Result> {
  return new Promise((resolve) => {
    pendingTransactionsByAccount[`${params.account}`].push(
      addSaveToRedisProxy({ resolve, ...params, retries: [], createdAt: params.createdAt ?? Date.now() })
    );
  });
}

async function saveToRedis() {
  const allPendingTransactions = Object.values(pendingTransactionsByAccount).flatMap((a) => a);
  await redis.set("transactions", JSON.stringify(allPendingTransactions));
}

function addSaveToRedisProxy<T extends PendingTransaction>(obj: T): T {
  return new Proxy(obj, {
    set(target, name, value) {
      saveToRedis();
      return Reflect.set(target, name, value);
    },
  });
}

// Fetch all the pending transactions from the DB and add them to the array
{
  // Get them from redis
  const redisTransactions = await redis.get("transactions");
  if (redisTransactions)
    // without the balance, so it can be checked again
    for (const { balance, ...transaction } of JSON.parse(redisTransactions) as PendingTransaction[])
      pendingTransactionsByAccount[`${transaction.account}`].push(addSaveToRedisProxy(transaction));

  const pendingDBTransactions = await getAccountTransactions(
    { status: AccountTransactionStatus.PENDING },
    {
      // sort by createdAt, the oldest first
      sort: { createdAt: 1 },
      projection: { type: 1, account: 1, fee: 1, amount: 1, sendTo: 1, createdAt: 1, details: 1 },
    }
  );

  for (const pendingDBTransaction of pendingDBTransactions) {
    if (pendingDBTransaction.type === AccountTransactionType.DEPOSIT) continue;

    // check the transaction is not already in the array
    if (
      pendingTransactionsByAccount[`${pendingDBTransaction.account}`].some(
        (t) => `${t.transactionId}` === `${pendingDBTransaction._id}`
      )
    )
      continue;

    const account = await getAccount(
      { _id: pendingDBTransaction.account },
      { projection: { _id: 1, balance: 1, privateKey: 1 } }
    );
    if (!account) {
      handleError(
        new Error(
          `Account ${pendingDBTransaction.account} not found for pending transaction ${pendingDBTransaction._id}`
        )
      );
      continue;
    }

    const client = await getClient({ account: account._id }, { projection: { _id: 1 } });
    if (!client) {
      handleError(
        new Error(
          `Client for account ${pendingDBTransaction.account} not found for pending transaction ${pendingDBTransaction._id}`
        )
      );
      continue;
    }

    submitTransaction({
      userId: client._id,
      balance: account.balance,
      fee: pendingDBTransaction.fee,
      type: pendingDBTransaction.type,
      amount: pendingDBTransaction.amount,
      sendTo: pendingDBTransaction.sendTo!,
      account: pendingDBTransaction.account,
      transactionId: pendingDBTransaction._id,
      createdAt: +pendingDBTransaction.createdAt,
      details: pendingDBTransaction.details ?? undefined,
      privateKey: await cryptr.decrypt(account.privateKey),
    });
  }
}
