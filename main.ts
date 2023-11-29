/// <reference lib="dom" />
/// <reference lib="deno.ns" />
/// <reference lib="dom.iterable" />
/// <reference no-default-lib="true" />
/// <reference lib="dom.asynciterable" />

import "./env.ts";
import "./telegram/initBots.ts";
import prefetchPlugin from "prefetch";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twindv1.ts";
import twindConfig from "./twind.config.ts";

await start(manifest, {
  plugins: [
    //
    twindPlugin(twindConfig),
    prefetchPlugin({ strategy: "opt-in" }),
  ],
});
