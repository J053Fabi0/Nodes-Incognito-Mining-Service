import { parse } from "std/flags/mod.ts";

const flags = parse(Deno.args, {
  boolean: ["ignoreDocker", "reloadRedisVariables"],
  alias: {
    ignoreDocker: ["ignore-docker", "i"],
    reloadRedisVariables: ["reload-redis-variables"],
  },
  default: {
    ignoreDocker: false,
    reloadRedisVariables: false,
  },
});

export default flags;
