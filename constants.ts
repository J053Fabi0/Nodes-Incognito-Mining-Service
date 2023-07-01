import joi from "joi";
import { parse } from "std/jsonc/mod.ts";
import Constants from "./types/constants.type.ts";
import { getNodes } from "./controllers/node.controller.ts";
import { allErrorTypes, AllErrorTypes } from "./utils/variables.ts";
import { getClient } from "./controllers/client.controller.ts";
import { getAccount } from "./controllers/account.controller.ts";

const schema = joi.object<Json>({
  minEpochsToBeOnline: joi.number().required(),
  minEpochsToLetSync: joi.number().required(),
  maxDiskPercentageUsage: joi.number().required(),
  waitingTimes: joi
    .object()
    .pattern(joi.string().valid(...allErrorTypes), joi.number().positive().allow(0))
    .required(),
});

interface Json {
  minEpochsToBeOnline: number;
  minEpochsToLetSync: number;
  maxDiskPercentageUsage: number;
  waitingTimes: Record<AllErrorTypes, number>;
}
const rawJson = parse(await Deno.readTextFile("./constants.jsonc")) as Record<string, unknown>;

const { error, value: json } = schema.validate(rawJson, { allowUnknown: true });

if (error) {
  console.error(error);
  Deno.exit(1);
}

const nodes = await getNodes({}, { projection: { name: 1, dockerIndex: 1, validatorPublic: 1, _id: 0 } });

const constants: Constants = nodes.map((node) => ({
  name: node.name,
  dockerIndex: node.dockerIndex,
  validatorPublic: node.validatorPublic,
}));

export default constants;

export const prvDecimalsDivisor = 1_000_000_000;
export const minEpochsToBeOnline = json.minEpochsToBeOnline;
export const minEpochsToLetSync = json.minEpochsToLetSync;
export const maxDiskPercentageUsage = json.maxDiskPercentageUsage;
export const waitingTimes = json.waitingTimes;

export const setupFeeUSD = 5;
export const minutesOfPriceStability = 60;

export const BAR_COLORS = [
  //
  "#ffb3ba",
  "#ffdfba",
  "#fafa9e",
  "#baffc9",
  "#bae1ff",
];

const admin = (await getClient({ role: "admin" }, { projection: { account: 1, _id: 0 } }))!;
export const adminAccount = (await getAccount({ _id: admin.account }))!;
if (!adminAccount) throw new Error("Admin account not found");
