import db from "../initDatabase.ts";
import AccountTransaction from "../types/collections/accountTransaction.type.ts";

const accountTransactionModel = db.collection<AccountTransaction>("accountTransactions");

accountTransactionModel.createIndexes({
  indexes: [
    { key: { type: 1 }, name: "type" },
    { key: { status: 1 }, name: "status" },
    { key: { account: 1 }, name: "account" },
    { key: { type: 1, status: 1 }, name: "type_status" },
  ],
});

export default accountTransactionModel;
