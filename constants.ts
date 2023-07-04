import joi from "joi";
import { parse } from "std/jsonc/mod.ts";
import Constants from "./types/constants.type.ts";
import { getNodes } from "./controllers/node.controller.ts";
import { getClient } from "./controllers/client.controller.ts";
import { getAccount } from "./controllers/account.controller.ts";
import { allErrorTypes, AllErrorTypes } from "./utils/variables.ts";

interface Json {
  infuraURL: string;
  incognitoFee: number;
  minEpochsToLetSync: number;
  minEpochsToBeOnline: number;
  adminTelegramUsername: string;
  maxDiskPercentageUsage: number;
  waitingTimes: Record<AllErrorTypes, number>;
}

const schema = joi.object<Json>({
  infuraURL: joi.string().uri().required(),
  minEpochsToLetSync: joi.number().required(),
  minEpochsToBeOnline: joi.number().required(),
  maxDiskPercentageUsage: joi.number().required(),
  incognitoFee: joi.number().positive().allow(0).default(0.1),
  adminTelegramUsername: joi.string().default("@incognitoNodes"),
  waitingTimes: joi
    .object()
    .pattern(joi.string().valid(...allErrorTypes), joi.number().positive().allow(0))
    .required(),
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
export const { infuraURL } = json;
/** Decimal format */
export const { incognitoFee } = json;
export const incognitoFeeInt = json.incognitoFee * 1e9;

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
export const { minEpochsToLetSync } = json;
export const { minEpochsToBeOnline } = json;
export const { maxDiskPercentageUsage } = json;
