import updateDockers from "../crons/updateDockers.ts";
import { maxPromises } from "duplicatedFilesCleanerIncognito";
import { changeNodeEarning, getNodeEarnings } from "../controllers/nodeEarning.controller.ts";

export default async function diffuse() {
  await updateDockers();
}

const earnings = await getNodeEarnings({}, { projection: { _id: 1, earning: 1 } });

console.time();
await maxPromises(
  earnings.map((e) => async () => {
    // if e.earning has decimals, convert to int format
    if (e.earning % 1 !== 0)
      await changeNodeEarning({ _id: e._id }, { $set: { earning: Math.floor(e.earning * 1e9) } });
  }),
  50
);
console.timeEnd();
