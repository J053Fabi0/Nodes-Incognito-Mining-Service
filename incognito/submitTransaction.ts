import {
  changeAccountTransaction,
  createAccountTransaction,
} from "../controllers/accountTransaction.controller.ts";
import { sleep } from "sleep";
import { ObjectId } from "mongo/mod.ts";
import IncognitoCli from "./IncognitoCli.ts";
import handleError from "../utils/handleError.ts";
import { incognitoFeeInt } from "../constants.ts";
import EventedArray from "../utils/EventedArray.ts";
import { moveDecimalDot } from "../utils/numbersString.ts";
import { changeAccount, getAccount } from "../controllers/account.controller.ts";
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
  resolve: (result: Result) => void;
  /** If you have uploaded the transaction. If not, it'll be uploaded automatically to the DB */
  transactionId?: ObjectId | string;
  /** The balance of the account. If not given, it'll be retrieved from the DB */
  balance?: number;
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
          // to do: update redis an get redis when the server starts

          async ({ array: pending, added }) => {
            // add missing fields
            if (added)
              for (const add of added) {
                if (add.fee === undefined) add.fee = incognitoFeeInt;
              }

            if (!working) {
              working = true;

              // Resolve all the pending transactions.
              while (pending.lengths > 0) {
                // get the first transaction
                const transaction = pending[0];
                if (!transaction) continue;

                // get the account's balance
                const balance =
                  transaction.balance ??
                  (await getAccount(
                    { _id: new ObjectId(transaction.account) },
                    { projection: { balance: 1, _id: 0 } }
                  ))!.balance;

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

                // check the balance is not enough
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
                  pending.shiftNoEvent();

                  // resolve the promise
                  transaction.resolve({
                    txHash: null,
                    errorDetails,
                    retries: transaction.retries,
                    status: AccountTransactionStatus.FAILED,
                  });
                  continue;
                }

                // decrese the account's balance by the total
                await changeAccount({ _id: new ObjectId(transaction.account) }, { $inc: { balance: -total } });

                // execute the transaction
                let txHash: string | undefined | null;
                {
                  const cli = new IncognitoCli(transaction.privateKey);
                  let i = 0;
                  do {
                    try {
                      txHash = await cli.send(transaction.sendTo, transaction.amount);
                      // temp testing
                      // txHash = await new Promise((r) => setTimeout(() => r("txHash_" + Math.random()), 60_000));
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

                // resolve the promise
                transaction.resolve({ status, txHash: txHash, retries: transaction.retries });
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
    pendingTransactionsByAccount[`${params.account}`].push({
      resolve,
      ...params,
      retries: [],
      createdAt: params.createdAt ?? Date.now(),
    });
  });
}

// to do: update redis an get redis when the server starts
