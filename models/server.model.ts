import db from "../initDatabase.ts";
import Server from "../types/collections/server.type.ts";

const serverModel = db.collection<Server>("servers");

serverModel.createIndexes({ indexes: [{ key: { url: 1 }, name: "url", unique: true }] });

export default serverModel;
