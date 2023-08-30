import joi from "joi";
import { parse } from "std/jsonc/mod.ts";

import { SERVER_ID } from "./env.ts";
import { getServerById } from "../controllers/server.controller.ts";
import { getClient } from "../controllers/client.controller.ts";
import { getAccount } from "../controllers/account.controller.ts";
import { getNodes } from "../controllers/node.controller.ts";
import Constants from "../types/constants.type.ts";

export const server = (await getServerById(SERVER_ID))!;
if (!server) throw new Error("Server not found.");

interface Json {
  infuraURL: string;
}

const schema = joi.object<Json>({
  infuraURL: joi.string().uri().required(),
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
