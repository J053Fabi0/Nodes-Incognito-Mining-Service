import { join } from "std/path/mod.ts";
import { ObjectId } from "mongo/mod.ts";
import { systemctl } from "../../utils/commands.ts";
import handleError from "../../utils/handleError.ts";
import getNodeName from "../../utils/getNodeName.ts";
import { repeatUntilNoError } from "duplicatedFilesCleanerIncognito";
import { sitesAvailable, sitesEnabled } from "./createNginxConfig.ts";

/**
 * @param number The node number of the owner, not docker index
 */
export default async function deleteNginxConfig(clientId: string | ObjectId, number: number) {
  const fileName = getNodeName(clientId, number);

  await Deno.remove(join(sitesEnabled, fileName)).catch(handleError);
  await Deno.remove(join(sitesAvailable, fileName)).catch(handleError);

  await repeatUntilNoError(() => systemctl(["reload", "nginx"]), 10, 2);
}
