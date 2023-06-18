import db from "../initDatabase.ts";
import Client from "../types/collections/client.type.ts";

const clientModel = db.collection<Client>("clients");

clientModel.createIndexes({
  indexes: [
    { key: { name: 1 }, name: "name", unique: true },
    { key: { telegram: 1 }, name: "telegram" },
    { key: { notionPage: 1 }, name: "notionPage" },
  ],
});

export default clientModel;
