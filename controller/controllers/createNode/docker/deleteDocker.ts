import { dataDir } from "./createDocker.ts";
import { docker } from "../../../../utils/commands.ts";
import doesDirExists from "../../../../utils/doesDirExists.ts";

/**
 * Stops and removes a docker container. Removes also the data directory.
 */
export default async function deleteDocker(
  dockerIndex: number,
  deleteDataDir = true
): Promise<{
  stopping: PromiseSettledResult<string>;
  removing: PromiseSettledResult<string>;
  removingDataDir: PromiseSettledResult<void>;
}> {
  const [stopping] = await Promise.allSettled([docker(["stop", `inc_mainnet_${dockerIndex}`])]);
  const [removing] = await Promise.allSettled([docker(["rm", `inc_mainnet_${dockerIndex}`])]);
  const [removingDataDir] = await Promise.allSettled([
    deleteDataDir && (await doesDirExists(`${dataDir}_${dockerIndex}`))
      ? Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true })
      : Promise.resolve(),
  ]);

  return { stopping, removing, removingDataDir };
}
