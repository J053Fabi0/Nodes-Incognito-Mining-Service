import { dataDir } from "./createDocker.ts";
import { docker } from "../../utils/commands.ts";
import handleError from "../../utils/handleError.ts";

/**
 * Stops and removes a docker container. Removes also the data directory by default.
 */
export default async function deleteDocker(dockerIndex: number, deleteDataDir = true) {
  await docker(["stop", `inc_mainnet_${dockerIndex}`]).catch(handleError);
  await docker(["rm", `inc_mainnet_${dockerIndex}`]).catch(handleError);
  if (deleteDataDir) await Deno.remove(`${dataDir}_${dockerIndex}`, { recursive: true }).catch(handleError);
}
