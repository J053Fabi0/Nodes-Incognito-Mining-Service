import * as a from "./dbUtils.ts";
import { Filter } from "mongo/mod.ts";
import Model from "../models/node.model.ts";
import Node from "../types/collections/node.type.ts";
import Server from "../types/collections/server.type.ts";

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

/** @returns The server of the node or null */
export async function getNodeServer(filter: Filter<Node>) {
  const [data] = (await aggregateNode([
    { $match: filter },
    { $project: { _id: 0, server: 1 } },
    { $limit: 1 },
    { $lookup: { from: "servers", localField: "server", foreignField: "_id", as: "server" } },
    { $unwind: "$server" },
  ])) as unknown as [{ server: Server }] | [];

  if (data) return data.server;
  return null;
}
