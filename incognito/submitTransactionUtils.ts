import {
  getAccountTransactions,
  changeAccountTransaction,
  createAccountTransaction,
} from "../controllers/accountTransaction.controller.ts";
import { ObjectId } from "mongo/mod.ts";
import { redis } from "../initDatabase.ts";
import cryptr from "../utils/cryptrInstance.ts";
import handleError from "../utils/handleError.ts";
import { moveDecimalDot } from "../utils/numbersString.ts";
import { getClient } from "../controllers/client.controller.ts";
import { EventedArrayWithoutHandler } from "../utils/EventedArray.ts";
import { changeAccount, getAccount } from "../controllers/account.controller.ts";
import submitTransaction, { PendingTransaction, pendingTransactionsByAccount } from "./submitTransaction.ts";
import { AccountTransactionStatus, AccountTransactionType } from "../types/collections/accountTransaction.type.ts";

const redisKey = "transactions";

export async function saveToRedis() {
  const allPendingTransactions = Object.values(pendingTransactionsByAccount).flatMap((a) => a);
  await redis.set(redisKey, JSON.stringify(allPendingTransactions));
}

export function addSaveToRedisProxy<T extends PendingTransaction>(obj: T): T {
  return new Proxy(obj, {
    set(target, name, value) {
      saveToRedis();
      return Reflect.set(target, name, value);
    },
  });
}

export async function fetchPendingTransactionsFromRedisAndDB() {
  // Get them from redis
  const redisTransactions = await redis.get(redisKey);
  if (redisTransactions)
    // without the balance, so it can be checked again
    for (const transaction of JSON.parse(redisTransactions) as PendingTransaction[])
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

/**
 * It uploads the transaction to the DB, updates the account's balance, set the
 * transaction to error if the balance is not enough, removes the transaction form the array
 * @returns True if the balance is enough, false if not
 */
export async function checkBalance(
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
  const balance: number = (await getAccount(
    { _id: new ObjectId(transaction.account) },
    { projection: { balance: 1, _id: 0 } }
  ))!.balance;

  // if the balance is not enough or the amount is less or equal to 0
  if (balance < total || transaction.amount <= 0) {
    // if so, update the transaction to failed
    const errorDetails =
      transaction.amount <= 0
        ? `Amount must be greater than 0`
        : `Balance not enough. You have ${moveDecimalDot(balance, -9)} PRV ` +
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
