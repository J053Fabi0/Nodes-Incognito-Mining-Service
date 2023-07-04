import {
  saveToRedis,
  checkBalance,
  addSaveToRedisProxy,
  fetchPendingTransactionsFromRedisAndDB,
} from "./submitTransactionUtils.ts";
import { sleep } from "sleep";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../env.ts";
import IncognitoCli from "./IncognitoCli.ts";
import handleError from "../utils/handleError.ts";
import { incognitoFeeInt } from "../constants.ts";
import EventedArray, { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";
import { changeAccountTransaction } from "../controllers/accountTransaction.controller.ts";
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
  /** Timestamp */
  createdAt: number;
  details?: string;
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

            if (working) return;
            working = true;

            // handle the transactions
            while (pending.lengthNoEvent > 0)
              try {
                await handlePendingTransactions(pending);
              } catch (e) {
                handleError(e);
                if (pending.lengthNoEvent > 0) await sleep(RETRY_DELAY);
              }

            working = false;
          }
        )()
      ));
    },
  }
);

async function handlePendingTransactions(
  pending: EventedArrayWithoutHandler<PendingTransaction>
): Promise<boolean> {
  // get the first transaction
  const [transaction] = pending;
  if (!transaction) return false;

  // execute the transaction
  const txHash: string | null | undefined = await (async (
    cli = new IncognitoCli(transaction.privateKey),
    maxRetries = transaction.maxRetries ?? MAX_RETRIES,
    retryDelay = transaction.retryDelay ?? RETRY_DELAY
  ) => {
    for (let i = 0; i < maxRetries; i++)
      try {
        if (IS_PRODUCTION) return await cli.send(transaction.sendTo, transaction.amount);
        // fake transactions for testing
        else return await new Promise<string>((r) => setTimeout(() => r(`txHash_${Math.random()}`), 3_000));
      } catch (e) {
        handleError(e);
        transaction.retries.push(Date.now());
        if (i !== maxRetries - 1) await sleep(retryDelay);
      }

    // undefined means that the transaction couldn't be done
    return undefined;
  })();

  const status = txHash === undefined ? AccountTransactionStatus.FAILED : AccountTransactionStatus.COMPLETED;

  // update the transaction in the DB
  await changeAccountTransaction(
    { _id: new ObjectId(transaction.transactionId!) },
    {
      $set: {
        status,
        txHash: txHash ?? null,
        retries: transaction.retries.map((r) => new Date(r)),
      },
    }
  );

  // remove it from the array
  pending.shiftNoEvent();
  saveToRedis();

  // resolve the promise
  transaction.resolve?.({ status, txHash: txHash ?? null, retries: transaction.retries });
  return true;
}

/**
 * @param urgent If true, the transaction will be placed at the beginning of the queue
 */
export default function submitTransaction(
  params: Omit<PendingTransaction, "resolve" | "retries" | "createdAt"> &
    Partial<Pick<PendingTransaction, "createdAt">>,
  urgent = false
): Promise<Result> {
  return new Promise((resolve) => {
    pendingTransactionsByAccount[`${params.account}`][urgent ? "unshift" : "push"](
      addSaveToRedisProxy({ resolve, ...params, retries: [], createdAt: params.createdAt ?? Date.now() })
    );
  });
}

// Fetch all the pending transactions from the DB and add them to the array
fetchPendingTransactionsFromRedisAndDB();
