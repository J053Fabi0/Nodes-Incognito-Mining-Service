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
