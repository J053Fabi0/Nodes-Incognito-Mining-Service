import { dataDir } from "./createDocker.ts";
import { docker } from "../../../../utils/commands.ts";

/**
 * Stops and removes a docker container. Removes also the data directory.
 */
export default async function deleteDocker(dockerIndex: number) {
  const [stopping] = await Promise.allSettled([docker(["stop", `inc_mainnet_${dockerIndex}`])]);
  const [removing] = await Promise.allSettled([docker(["rm", `inc_mainnet_${dockerIndex}`])]);
  const [removingDataDir] = await Promise.allSettled([
    Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true }),
  ]);

  return { stopping, removing, removingDataDir };
}
