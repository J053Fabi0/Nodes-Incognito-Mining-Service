import db from "../initDatabase.ts";
import Client from "../types/collections/client.type.ts";

const clientModel = db.collection<Client>("clients");

// Exmaple of creating indexes
// authorModel.createIndexes({
//   indexes: [
//     { key: { telegram: 1 }, name: "telegram", unique: true },
//     { key: { notionPage: 1 }, name: "notionPage", unique: true },
//     { key: { telegram: 1, notionPage: 1 }, name: "telegram_notionPage", unique: true },
//   ],
// });

export default clientModel;
