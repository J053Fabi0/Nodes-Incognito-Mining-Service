import { ObjectId } from "mongo/mod.ts";
import CommonCollection from "./commonCollection.type.ts";

export enum AccountTransactionType {
  /** Used to pay for new nodes or nodes fees */
  EXPENSE = "expense",
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
}

export enum AccountTransactionStatus {
  FAILED = "failed",
  PENDING = "pending",
  COMPLETED = "completed",
}

export default interface AccountTransaction extends CommonCollection {
  type: AccountTransactionType;
  /** Payment address */
  sendTo: string | null;
  account: ObjectId;
  /** Int format. Always positive. It does not include the incognito fee. */
  amount: number;
  /** Int format. */
  fee: number;
  txHash: string;
  status: AccountTransactionStatus;
  /** The first date will be the first retry, not the first try. To get the first try, read `createdAt` */
  retries: Date[];
}
