import { ObjectId } from "mongo/mod.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { deleteNodeEarnings, getNodeEarnings } from "../controllers/nodeEarning.controller.ts";

export default async function diffuse() {
  const nodes = await getNodes();

  let totalDeleted = 0;
  const allEarningsToDelete: ObjectId[] = [];
  for (const node of nodes) {
    const earnings = await getNodeEarnings({ node: node._id });

    const earningsToDelete: ObjectId[] = [];
    for (const earning of earnings) if (earning.epoch <= node.epoch) earningsToDelete.push(earning._id);

    if (earningsToDelete.length) {
      console.log(`Deleting ${earningsToDelete.length} earnings from node ${node.name}`);
      allEarningsToDelete.push(...earningsToDelete);
    }

    totalDeleted += earningsToDelete.length;
  }

  await deleteNodeEarnings({ _id: { $in: allEarningsToDelete } });
  console.log("Total deleted:", totalDeleted);
}
