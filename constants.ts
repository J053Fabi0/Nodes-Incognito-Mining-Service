import joi from "joi";
import { parse } from "std/jsonc/mod.ts";
import Constants from "./types/constants.type.ts";
import { getNodes } from "./controllers/node.controller.ts";
import { getClient } from "./controllers/client.controller.ts";
import { getAccount } from "./controllers/account.controller.ts";
import { allErrorTypes, AllErrorTypes } from "./utils/variables.ts";

interface Json {
  /** Decimal format */
  incognitoFee: number;
  minEpochsToBeOnlinePending: number;
  minEpochsToBeOnlineSyncing: number;
  maxOnlineNodesNotStaked: number;
  adminTelegramUsername: string;
  maxDiskPercentageUsage: number;
  waitingTimes: Record<AllErrorTypes, number>;
  /** for nodes with more than 1 month working */
  maxNotStakedDays: number;
  /** for nodes with less than 1 month working */
  maxNotStakedDaysForNew: number;
  /** monthly fee */
  maxNotPayedDays: number;
  /** in seconds */
  cacheMonitorInfoEvery: number;
  /** The max numbers of minutes a not-staked node can be online */
  maxOnlineMinutesNotStaked: number;
  /** The min shards to keep for each one. For example, always keep at least 2 shard4. */
  minShardsToKeep: number;
  /** Minutes to repeat an alert */
  minutesToRepeatAlert: number;
  /** Minutes between attempts to fix low disk space */
  minutesBetweenFixLowDiskSpace: number;
}

const schema = joi.object<Json>({
  minEpochsToBeOnlinePending: joi.number().required(),
  minEpochsToBeOnlineSyncing: joi.number().required(),
  maxDiskPercentageUsage: joi.number().required(),
  maxNotPayedDays: joi.number().integer().default(3),
  incognitoFee: joi.number().positive().allow(0).default(0.1),
  adminTelegramUsername: joi.string().default("@incognitoNodes"),
  waitingTimes: joi
    .object()
    .pattern(joi.string().valid(...allErrorTypes), joi.number().positive().allow(0))
    .required(),
  maxNotStakedDays: joi.number().integer().allow(0).default(3),
  maxNotStakedDaysForNew: joi.number().integer().min(4).default(10),
  cacheMonitorInfoEvery: joi.number().integer().min(1).default(15),
  maxOnlineNodesNotStaked: joi.number().integer().allow(0).default(3),
  maxOnlineMinutesNotStaked: joi.number().integer().min(1).default(20),
  minShardsToKeep: joi.number().integer().min(1).default(2),
  minutesToRepeatAlert: joi.number().integer().min(1).default(30),
  minutesBetweenFixLowDiskSpace: joi.number().integer().min(1).default(20),
});
const rawJson = parse(await Deno.readTextFile("./constants.jsonc")) as Record<string, unknown>;

const { error, value: json } = schema.validate(rawJson, { allowUnknown: true });

if (error) {
  console.error(error);
  Deno.exit(1);
}

/////////////////////
///// Incognito /////
/////////////////////
/** Decimal format */
export const { incognitoFee } = json;
export const incognitoFeeInt = json.incognitoFee * 1e9;
export const { maxNotStakedDays, maxNotStakedDaysForNew, maxNotPayedDays } = json;

const nodes = await getNodes(
  { inactive: false },
  { projection: { name: 1, dockerIndex: 1, validatorPublic: 1, _id: 0 } }
);
const constants: Constants = nodes.map((node) => ({
  name: node.name,
  dockerIndex: node.dockerIndex,
  validatorPublic: node.validatorPublic,
}));
export default constants;

export const setupFeeUSD = 5;
export const minutesOfPriceStability = 60;

///////////////
//// Admin ////
///////////////
const admin = (await getClient({ role: "admin" }, { projection: { account: 1, telegram: 1 } }))!;
export const adminId = admin._id;
/** Telegram ID */
export const adminTelegram = admin.telegram!;
/** The Incognito Account, not the client data */
export const adminAccount = (await getAccount({ _id: admin.account }))!;
if (!adminAccount) throw new Error("Admin account not found");
export const { adminTelegramUsername } = json;

///////////////
//// Other ////
///////////////
export const BAR_COLORS = [
  //
  "#ffb3ba",
  "#ffdfba",
  "#fafa9e",
  "#baffc9",
  "#bae1ff",
] as const;
export const { waitingTimes } = json;
export const { minShardsToKeep } = json;
export const { minutesToRepeatAlert } = json;
export const { cacheMonitorInfoEvery } = json;
export const { maxDiskPercentageUsage } = json;
export const { maxOnlineNodesNotStaked } = json;
export const { maxOnlineMinutesNotStaked } = json;
export const { minutesBetweenFixLowDiskSpace } = json;
export const { minEpochsToBeOnlinePending, minEpochsToBeOnlineSyncing } = json;
