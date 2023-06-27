import dayjs from "dayjs/mod.ts";
import { ObjectId } from "mongo/mod.ts";
import * as a from "./dbUtils.ts";
import Model from "../models/nodeEarning.model.ts";

export const getNodeEarnings = a.find(Model);
export const getNodeEarning = a.findOne(Model);
export const getNodeEarningById = a.findById(Model);

export const countNodeEarnings = a.count(Model);

export const createNodeEarning = a.insertOne(Model);
export const createNodeEarnings = a.insertMany(Model);

export const changeNodeEarning = a.updateOne(Model);
export const changeNodeEarnings = a.updateMany(Model);

export const deleteNodeEarning = a.deleteOne(Model);
export const deleteNodeEarnings = a.deleteMany(Model);

export const aggregateNodeEarning = a.aggregate(Model);

/**
 * Returns the total earnings of a node or nodes in the last `monthsToSubtract` months
 * @param nodeOrNodes If given an empty array or null, it will return the total earnings of all nodes
 * @param monthsToSubtract
 */
export async function getTotalEarnings(nodeOrNodes: ObjectId | ObjectId[] | null, monthsToSubtract: number) {
  const time: { $gte: Date; $lte?: Date } = {
    $gte: dayjs().subtract(monthsToSubtract, "month").startOf("month").toDate(),
  };
  // if the monthsToSubtract is 0, we don't need to add the $lte
  if (monthsToSubtract !== 0) time.$lte = dayjs().subtract(monthsToSubtract, "month").endOf("month").toDate();

  const match: { node?: ObjectId | { $in: ObjectId[] }; time: typeof time } = { time };

  if (Array.isArray(nodeOrNodes)) {
    if (nodeOrNodes.length > 0) match.node = { $in: nodeOrNodes };
  } else if (nodeOrNodes) {
    match.node = nodeOrNodes;
  }

  const totalEarnings = (await aggregateNodeEarning([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$earning" } } },
  ])) as unknown as [{ _id: null; total: number }] | [];

  return totalEarnings[0]?.total || 0;
}
