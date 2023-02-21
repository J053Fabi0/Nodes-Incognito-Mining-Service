import constants from "../../constants.ts";
import binaryWrapper from "./binaryWrapper.ts";
import repeatUntilNoError from "./repeatUntilNoError.ts";

export const cp = binaryWrapper("cp");
export const rm = binaryWrapper("rm");
export const ls = binaryWrapper("ls");
export const chown = binaryWrapper("chown");

const _docker = binaryWrapper("docker");

export const docker = (name: string | string[], action: "start" | "stop", maxRetries = 5) =>
  repeatUntilNoError(
    () => _docker(["container", action, ...(typeof name === "string" ? [name] : name)], (v) => v.slice(0, -1)),
    maxRetries,
    undefined,
    (e, i) => console.log(`Error on attempt ${i} of ${maxRetries} to ${action} container ${name}:\n${e}`)
  );

export const dockerPs = () =>
  _docker(["ps", "--all", "--no-trunc", "--filter", "name=^inc_mainnet_"], (v) => {
    const dockersStatus = v
      // Get rid of a last "\n" that always has nothing.
      .slice(0, -1)
      .split("\n")
      // Remove the first line that is the header.
      .slice(1)
      .reduce((obj, v) => {
        obj[+/(?<=inc_mainnet_)\d+/.exec(v)![0]] = / Up (\d+|about) /gi.test(v) ? "ONLINE" : "OFFLINE";
        return obj;
      }, {} as Record<number | string, "ONLINE" | "OFFLINE">);

    for (const { dockerIndex } of constants)
      if (dockersStatus[dockerIndex] === undefined) dockersStatus[dockerIndex] = "OFFLINE";

    return dockersStatus;
  });
