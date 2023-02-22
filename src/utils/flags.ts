const flags = {
  ignoreDocker: Deno.args.includes("--ignore-docker"),
};

export default flags;
