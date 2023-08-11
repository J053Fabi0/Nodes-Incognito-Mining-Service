import axiod from "axiod";
import sortNodes from "../utils/sortNodes.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";

export default async function checkKeysMatch() {
  const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex } = await sortNodes();

  for (const [dockerIndex, node] of nodesInfo) {
    if (node.docker.running === false) continue;

    const nodeStatus = nodesStatusByDockerIndex[dockerIndex];
    if (!nodeStatus) continue;

    try {
      const a = await axiod.post(`http://${nodeStatus.name}.nodes.josefabio.com`, {
        jsonrpc: "1.0",
        method: "getmininginfo",
        params: "",
        id: 1,
      });
      if (!a.data.Result) throw new Error("No result");
      if (!a.data.Result.MiningPublickey) throw new Error("No public key");
      if (typeof a.data.Result.MiningPublickey !== "string") throw new Error("Public key is not a string");

      const real = a.data.Result.MiningPublickey;
      const db = nodeStatus.validatorPublic;

      if (real !== db)
        await sendHTMLMessage(
          `The public key of <code>${dockerIndex}</code> is not equal to the one in the database.\n\n` +
            `DB: <code>${db}</code>\n` +
            `Real: <code>${real}</code>\n` +
            `<code>http://${nodeStatus.name}.nodes.josefabio.com</code>`
        );
    } catch {
      //
    }
  }
}
