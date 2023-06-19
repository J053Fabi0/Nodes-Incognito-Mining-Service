import { parse } from "std/flags/mod.ts";

const flags = parse(Deno.args, {
  boolean: ["ignoreDocker"],
  alias: {
    ignoreDocker: ["ignore-docker", "i"],
  },
  default: {
    ignoreDocker: false,
  },
});

export default flags;
