import joi from "joi";
import { parse } from "std/jsonc/mod.ts";
import { getNodes } from "./controllers/node.controller.ts";
import DuplicatedFilesCleaner, { Constants } from "duplicatedFilesCleanerIncognito";

const schema = joi.object<Json>({
  homePath: joi.string().required(),
  fileSystem: joi.string().required(),
  minFilesToConsiderShard: joi.number().required(),
});

type Json = Omit<Constants, "instructions" | "validatorPublicKeys">;
const rawJson = parse(await Deno.readTextFile("./constants.jsonc")) as Record<string, unknown>;

const { error, value: json } = schema.validate(rawJson, { stripUnknown: true });

if (error) {
  console.error(error);
  Deno.exit(1);
}

const nodes = await getNodes({ inactive: false }, { projection: { dockerIndex: 1, _id: 0 } });

export const duplicatedConstants: Constants = {
  ...json,
  dockerIndexes: nodes.map((node) => node.dockerIndex),
};

const duplicatedFilesCleaner = new DuplicatedFilesCleaner(duplicatedConstants);
export default duplicatedFilesCleaner;
