import db from "../initDatabase.ts";
import NodeEarning from "../types/collections/nodeEarning.type.ts";

const nodeEarningModel = db.collection<NodeEarning>("nodeEarnings");

nodeEarningModel.createIndexes({
  indexes: [
    { key: { node: 1 }, name: "nodeEarningss_node" },
    { key: { node: 1, epoch: 1 }, name: "nodeEarningss_node_epoch", unique: true },
  ],
});

export default nodeEarningModel;
