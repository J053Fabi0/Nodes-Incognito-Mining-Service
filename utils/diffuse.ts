import { getNodes, changeNode } from "../controllers/node.controller.ts";
import getBlockchainInfo from "../incognito/getBlockchainInfo.ts";

export default async function diffuse() {
  const info = await getBlockchainInfo();
  console.log(info?.BestBlocks["-1"].Epoch);

  interface Data {
    lastEpoch: number;
    /** epoch: date */
    data: Record<number | string, { start?: number; end?: number } | undefined>;
  }

  const data: Data = await Deno.readFile("epochsDates.json").then((x) => JSON.parse(new TextDecoder().decode(x)));

  const nodes = await getNodes();

  const entries = Object.entries(data.data);

  for (const node of nodes) {
    if (typeof node.epoch === "number") continue;

    const a = entries.find(([, data]) => {
      if (!data) return false;
      return data.start && data.start <= +node.createdAt && data.end && data.end >= +node.createdAt;
    });

    console.log(node.name, a ? a[0] : "No data");

    let epoch = a ? +a[0] : null;
    if (node.name === "82-64d475bf684cbb1cf670250a") epoch = 11313;

    if (epoch !== null) {
      await changeNode({ _id: node._id }, { $set: { epoch } });
      console.log(`Node ${node.name} has been updated to epoch ${epoch}`);
    }
  }
}
