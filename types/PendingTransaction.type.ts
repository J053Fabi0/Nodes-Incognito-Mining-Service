import joi from "joi";
import { ObjectId } from "mongo/mod.ts";
import { incognitoFeeInt } from "../constants.ts";
import TransactionResult from "./TransactionResult.type.ts";
import { AccountTransactionType } from "./collections/accountTransaction.type.ts";

export default interface PendingTransaction {
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
  resolve?: (result: TransactionResult) => void;
  /** If you have uploaded the transaction. If not, it'll be uploaded automatically to the DB */
  transactionId?: ObjectId | string;
  /** Timestamp */
  createdAt: number;
  details?: string;
}

export const pendingTransactionSchema = joi.object<PendingTransaction>({
  type: joi.string().valid(AccountTransactionType.EXPENSE, AccountTransactionType.WITHDRAWAL).required(),
  amount: joi.number().integer().positive().required(),
  fee: joi.number().integer().positive().allow(0).default(incognitoFeeInt),
  sendTo: joi.string().required(),
  // account: joi.string().required(),
  account: joi.alternatives().try(joi.string(), joi.object().instance(ObjectId)).required(),
  privateKey: joi.string().required(),
  userId: joi.alternatives().try(joi.string(), joi.object().instance(ObjectId)).required(),
  retries: joi.array().items(joi.number().integer().required()).required(),
  maxRetries: joi.number().integer().positive().allow(0),
  retryDelay: joi.number().integer().positive().allow(0),
  resolve: joi.func(),
  transactionId: joi.alternatives().try(joi.string(), joi.object().instance(ObjectId)).required(),
  createdAt: joi.number().integer().required(),
  details: joi.string(),
});
