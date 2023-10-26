import { sleep } from "sleep";
import { ObjectId } from "mongo/mod.ts";
import { IS_PRODUCTION } from "../env.ts";
import IncognitoCli from "./IncognitoCli.ts";
import handleError from "../utils/handleError.ts";
import { incognitoFeeInt } from "../constants.ts";
import { notAssignableKeys } from "../utils/createTrueRecord.ts";
import TransactionResult from "../types/TransactionResult.type.ts";
import PendingTransaction from "../types/PendingTransaction.type.ts";
import EventedArray, { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";
import { changeAccountTransaction } from "../controllers/accountTransaction.controller.ts";
import { AccountTransactionStatus } from "../types/collections/accountTransaction.type.ts";
import { checkBalance, fetchPendingTransactionsFromRedisAndDB } from "./submitTransactionUtils.ts";

export const MAX_RETRIES = 5;
/** In seconds */
export const RETRY_DELAY = 1 * 60;

/**
 * This is a true record that can never return undefined
 * You can push a new transaction to this array and it'll be executed automatically.
 * But its better to use the function `submitTransaction` instead.
 * @key account id, not client id
 */
export const pendingTransactionsByAccount = new Proxy<Record<string, EventedArray<PendingTransaction>>>(
  {},
  {
    get(target, key: string) {
      if (typeof key === "symbol" || notAssignableKeys.includes(key)) return Reflect.get(target, key);
      if (key in target) return target[key];

      // If the array for this account doesn't exist, create it
      return (target[key] = new EventedArray<PendingTransaction>(
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
    set(target, name, value) {
      return Reflect.set(target, name, value);
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
    maxRetries = (transaction.maxRetries ?? MAX_RETRIES) - transaction.retries.length,
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
): Promise<TransactionResult> {
  return new Promise((resolve) => {
    pendingTransactionsByAccount[`${params.account}`][urgent ? "unshift" : "push"]({
      resolve,
      ...params,
      retries: [],
      createdAt: params.createdAt ?? Date.now(),
    });
  });
}

// Fetch all the pending transactions from the DB and add them to the array
fetchPendingTransactionsFromRedisAndDB();
