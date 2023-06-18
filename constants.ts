import joi from "joi";
import { parse } from "std/jsonc/mod.ts";
import Constants from "./src/types/constants.type.ts";
import { getNodes } from "./src/controllers/node.controller.ts";
import { allErrorTypes, AllErrorTypes } from "./src/utils/variables.ts";

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
