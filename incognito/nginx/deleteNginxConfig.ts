import { ObjectId } from "mongo/mod.ts";
import { join } from "std/path/mod.ts";
import { systemctl } from "../../utils/commands.ts";
import { sitesAvailable, sitesEnabled } from "./createNginxConfig.ts";

/**
 * @param number The node number of the owner, not docker index
 */
export default async function deleteNginxConfig(clientId: string | ObjectId, number: number) {
  const fileName = `${number}-${clientId}`.toLowerCase();

  await Deno.remove(join(sitesAvailable, fileName));
  await Deno.remove(join(sitesEnabled, fileName));

  await systemctl(["reload", "nginx"]);
}
