import { ObjectId } from "mongo";
import nameOfMonth from "./nameOfMonth.ts";
import getTable from "../notion/getTable.ts";
import getTableID from "../notion/getTableID.ts";
import { getNodes } from "../controllers/node.controller.ts";
import { createNodeEarning } from "../controllers/nodeEarning.controller.ts";

const nodes = (await getNodes()).reduce((obj, node) => {
  obj[node.number] = node._id;
  return obj;
}, {} as Record<string, ObjectId>);

// same as above but programmatically
const dates = Array.from({ length: 20 }, (_, i) => new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * i));

for (const date of dates) {
  const database_id = await getTableID("f91d95c318d1492397fc4196da34dfe9", date);
  console.log(database_id, date);

  if (!database_id) continue;

  const table = await getTable(database_id);

  for (const { properties } of table) {
    const dateString = properties["Date"]?.type === "date" && properties["Date"].date?.start;
    const [year, month, day] = (dateString || `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}}`)
      .split("-")
      .map((a) => parseInt(a));
    const time = new Date(year, month - 1, day);

    const nodeSelect = properties["Node"]?.type === "select" && properties["Node"].select?.name;
    const nodeNumber = properties["Node"]?.type === "number" && properties["Node"].number;
    const node = nodes[nodeSelect || nodeNumber || 1];

    const earning = properties["Total earnings"]?.type === "number" && properties["Total earnings"].number;
    const epoch = properties["Epochs"]?.type === "title" && properties["Epochs"].title[0].plain_text;

    if (!node || !epoch || typeof earning !== "number") {
      console.log({ time, node, earning, epoch: parseInt(epoch || "0") });
      continue;
    }

    try {
      await createNodeEarning({ time, node, earning, epoch: parseInt(epoch) });
    } catch {
      console.log(nameOfMonth(time) + " - " + time.getFullYear(), nodeSelect || nodeNumber || 1, epoch);
    }
  }
}
