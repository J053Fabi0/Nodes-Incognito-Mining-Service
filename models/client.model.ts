import db from "../initDatabase.ts";
import Client from "../types/collections/client.type.ts";

const clientModel = db.collection<Client>("clients");

await clientModel.createIndexes({
  indexes: [
    { key: { name: 1 }, name: "name" },
    { key: { account: 1 }, name: "account", unique: true },
    { key: { telegram: 1 }, name: "telegram", unique: true },
  ],
});

export default clientModel;
