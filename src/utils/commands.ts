import repeatUntilNoError from "./repeatUntilNoError.ts";
import binaryWrapper from "./binaryWrapper.ts";
export const chown = binaryWrapper("chown");
export const cp = binaryWrapper("cp");
export const rm = binaryWrapper("rm");
export const ls = binaryWrapper("ls");

const _docker = binaryWrapper("docker");
export const docker = (name: string | string[], action: "start" | "stop", maxRetries = 5) =>
  repeatUntilNoError(
    () => _docker(["container", action, ...(typeof name === "string" ? [name] : name)], (v) => v.slice(0, -1)),
    maxRetries,
    undefined,
    (e, i) => console.log(`Error on attempt ${i} of ${maxRetries} to ${action} container ${name}:\n${e}`)
  );
export const dockerPs = () =>
  _docker(["ps", "--all", "--no-trunc", "--filter", '"name=^inc_mainnet_"'], (v) =>
    v
      // Get rid of a last "\n" that always has nothing.
      .slice(0, -1)
      .split("\n")
      // Remove the first line that is the header.
      .slice(1)
      .map((v) => ({
        dockerIndex: +/(?<=inc_mainnet_)\d+/.exec(v)![0],
        status: / Up \d+ /g.test(v) ? "ONLINE" : "OFFLINE",
      }))
  );

export function getExtraFiles(nodePathToShard: string) {
  return ls([nodePathToShard], (v) =>
    v
      .split("\n")
      // Get rid of a last "\n" that always has nothing.
      .slice(0, -1)
      // Filter every file that doesn't end with '.ldb'.
      .filter((v) => v.endsWith(".ldb") === false)
  );
}
