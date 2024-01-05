import prefetchPlugin from "prefetch";
import twindConfig from "./tailwind.config.ts";
import { defineConfig } from "$fresh/server.ts";
import twindPlugin from "$fresh/plugins/twindv1.ts";

export default defineConfig({
  plugins: [
    //
    twindPlugin(twindConfig),
    prefetchPlugin({ strategy: "opt-in" }),
  ],
});
