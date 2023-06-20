/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "./env.ts";
import { sleep } from "sleep";
import check from "./check.ts";
import "./telegram/initBots.ts";
import checkEarnings from "./checkEarnings.ts";
import handleError from "./utils/handleError.ts";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin, { Options } from "$fresh/plugins/twindv1.ts";
import twindConfig from "./twind.config.ts";

start(manifest, { plugins: [twindPlugin(twindConfig as unknown as Options)] });

// Start to check the earnings
checkEarnings();

// Start to check the dockers and nodes' status
while (true)
  try {
    await check();
  } catch (e) {
    handleError(e);
  } finally {
    await sleep(60);
  }
