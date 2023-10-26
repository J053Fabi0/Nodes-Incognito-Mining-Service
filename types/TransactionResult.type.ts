import PendingTransaction from "./PendingTransaction.type.ts";
import { AccountTransactionStatus } from "./collections/accountTransaction.type.ts";

export default interface TransactionResult {
  /** If it's null, the result couldn't be parsed, but the transaction may have been done anyway */
  txHash: string | null;
  retries: PendingTransaction["retries"];
  status: AccountTransactionStatus.COMPLETED | AccountTransactionStatus.FAILED;
  errorDetails?: string;
}
