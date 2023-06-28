import db from "../initDatabase.ts";
import Node from "../types/collections/node.type.ts";

const nodeModel = db.collection<Node>("nodes");

nodeModel.createIndexes({
  indexes: [
    { key: { client: 1 }, name: "nodes_client" },
    { key: { client: 1, inactive: 1 }, name: "nodes_client_inactive" },
    { key: { client: 1, name: 1 }, name: "nodes_client_name", unique: true },
    { key: { client: 1, number: 1 }, name: "nodes_client_number", unique: true },

    { key: { inactive: 1 }, name: "nodes_inactive" },
    { key: { dockerIndex: 1 }, name: "nodes_dockerIndex", unique: true },
    { key: { paymentAddress: 1 }, name: "nodes_paymentAddress", unique: true },
    { key: { validatorPublic: 1 }, name: "nodes_validatorPublic", unique: true },
  ],
});

export default nodeModel;
