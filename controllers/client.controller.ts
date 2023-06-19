import * as a from "./dbUtils.ts";
import Model from "../models/client.model.ts";

export const getClients = a.find(Model);
export const getClient = a.findOne(Model);
export const getClientById = a.findById(Model);

export const countClients = a.count(Model);

export const createClient = a.insertOne(Model);
export const createClients = a.insertMany(Model);

export const changeClient = a.updateOne(Model);
export const changeClients = a.updateMany(Model);

export const deleteClient = a.deleteOne(Model);
export const deleteClients = a.deleteMany(Model);

export const aggregateClient = a.aggregate(Model);
