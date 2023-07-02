import * as a from "./dbUtils.ts";
import Model from "../models/account.model.ts";

export const getAccountTransactions = a.find(Model);
export const getAccountTransaction = a.findOne(Model);
export const getAccountTransactionById = a.findById(Model);

export const countAccountTransactions = a.count(Model);

export const createAccountTransaction = a.insertOne(Model);
export const createAccountTransactions = a.insertMany(Model);

export const changeAccountTransaction = a.updateOne(Model);
export const changeAccountTransactions = a.updateMany(Model);

export const deleteAccountTransaction = a.deleteOne(Model);
export const deleteAccountTransactions = a.deleteMany(Model);

export const aggregateAccountTransaction = a.aggregate(Model);
