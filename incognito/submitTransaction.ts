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
import EventedArray from "../utils/EventedArray.ts";
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
                        txHash = await new Promise<string>((r) =>
                          setTimeout(() => r(`txHash_${Math.random()}`), 3_000)
                        );
                      }
                    } catch (e) {
                      handleError(e);
                      transaction.retries.push(Date.now());
                      await sleep(transaction.retryDelay ?? RETRY_DELAY);
                    }
                    // repeat while there's no txHash and the number of retries is less than the max
                  } while (txHash === undefined && ++i <= (transaction.maxRetries ?? MAX_RETRIES));
                  txHash = txHash ?? null;
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
                transaction.resolve?.({ status, txHash, retries: transaction.retries });
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

// Fetch all the pending transactions from the DB and add them to the array
fetchPendingTransactionsFromRedisAndDB();
