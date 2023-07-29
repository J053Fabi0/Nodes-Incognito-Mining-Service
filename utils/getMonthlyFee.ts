import { Big } from "math";
import { ObjectId } from "mongo/mod.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { toFixedS } from "../utils/numbersString.ts";
import { getTotalEarnings } from "../controllers/nodeEarning.controller.ts";

/** Int format, without incognito fee. Only from active nodes. */
export default async function getMonthlyFee(client: ObjectId): Promise<number> {
  const nodes = await getNodes({ client, inactive: false }, { projection: { _id: 1 } }).then((ns) =>
    ns.map((n) => n._id)
  );
  if (!nodes.length) return 0;

  const earningsLastMonth = await getTotalEarnings(nodes, 1);
  return +toFixedS(Big(earningsLastMonth).div(10).mul(1000000000).valueOf(), 0);
}
