import db from "../initDatabase.ts";
import Client from "../types/collections/client.type.ts";

const authorModel = db.collection<Client>("clients");

export default authorModel;
