import db from "../initDatabase.ts";
import Node from "../types/collections/node.type.ts";

const nodeModel = db.collection<Node>("nodes");

nodeModel.createIndexes({
  indexes: [
    { key: { client: 1 }, name: "nodes_client" },
    { key: { dockerIndex: 1 }, name: "nodes_dockerIndex", unique: true },
  ],
});

export default nodeModel;
