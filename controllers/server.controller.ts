import * as a from "./dbUtils.ts";
import Model from "../models/server.model.ts";

export const getServers = a.find(Model);
export const getServer = a.findOne(Model);
export const getServerById = a.findById(Model);

export const countServers = a.count(Model);

export const createServer = a.insertOne(Model);
export const createServers = a.insertMany(Model);

export const changeServer = a.updateOne(Model);
export const changeServers = a.updateMany(Model);

export const deleteServer = a.deleteOne(Model);
export const deleteServers = a.deleteMany(Model);

export const aggregateServer = a.aggregate(Model);
