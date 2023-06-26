import db from "../initDatabase.ts";
import Account from "../types/collections/account.type.ts";

const accountModel = db.collection<Account>("clients");

accountModel.createIndexes({
  indexes: [
    //
    { key: { privateKey: 1 }, name: "privateKey", unique: true },
  ],
});

export default accountModel;
