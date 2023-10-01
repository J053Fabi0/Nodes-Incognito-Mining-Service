import joi from "joi";
import { server } from "./constants.ts";
import { parse } from "std/jsonc/mod.ts";
import { getNodes } from "../controllers/node.controller.ts";
import Constants from "../duplicatedFilesCleaner/types/constants.type.ts";
import DuplicatedFilesCleaner from "../duplicatedFilesCleaner/src/DuplicatedFilesCleaner.ts";

type Json = Pick<Constants, "homePath" | "minFilesToConsiderShard">;
const schema = joi.object<Json>({
  homePath: joi.string().required(),
  minFilesToConsiderShard: joi.number().required(),
});

const rawJson = parse(await Deno.readTextFile("./controller/constants.jsonc")) as Record<string, unknown>;

const { error, value: json } = schema.validate(rawJson, { stripUnknown: true });

if (error) {
  console.error(error);
  Deno.exit(1);
}

const nodes = await getNodes({ inactive: false, server: server._id }, { projection: { dockerIndex: 1, _id: 0 } });

export const duplicatedConstants: Constants = {
  ...json,
  dockerIndexes: nodes.map((node) => node.dockerIndex),
};

const duplicatedFilesCleaner = new DuplicatedFilesCleaner(duplicatedConstants);
export default duplicatedFilesCleaner;
