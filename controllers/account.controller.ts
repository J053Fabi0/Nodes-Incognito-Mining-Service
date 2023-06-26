import * as a from "./dbUtils.ts";
import Model from "../models/account.model.ts";

export const getAccounts = a.find(Model);
export const getAccount = a.findOne(Model);
export const getAccountById = a.findById(Model);

export const countAccounts = a.count(Model);

export const createAccount = a.insertOne(Model);
export const createAccounts = a.insertMany(Model);

export const changeAccount = a.updateOne(Model);
export const changeAccounts = a.updateMany(Model);

export const deleteAccount = a.deleteOne(Model);
export const deleteAccounts = a.deleteMany(Model);

export const aggregateAccount = a.aggregate(Model);
