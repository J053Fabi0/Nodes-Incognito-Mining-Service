import * as a from "./dbUtils.ts";
import Model from "../models/node.model.ts";

export const getNodes = a.find(Model);
export const getNode = a.findOne(Model);
export const getNodeById = a.findById(Model);

export const countNodes = a.count(Model);

export const createNode = a.insertOne(Model);
export const createNodes = a.insertMany(Model);

export const changeNode = a.updateOne(Model);
export const changeNodes = a.updateMany(Model);

export const deleteNode = a.deleteOne(Model);
export const deleteNodes = a.deleteMany(Model);

export const aggregateNode = a.aggregate(Model);
