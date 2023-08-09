import axiod from "axiod";
import { getNodes } from "../controllers/node.controller.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";

export default async function checkKeysMatch() {
  const nodesInfo = await duplicatedFilesCleaner.getInfo();
  const nodes = await getNodes({}, { projection: { name: 1, validatorPublic: 1, dockerIndex: 1 } });

  for (const node of nodes) {
    if (nodesInfo[node.dockerIndex].docker.running === false) continue;

    try {
      const a = await axiod.post(`http://${node.name}.nodes.josefabio.com`, {
        jsonrpc: "1.0",
        method: "getmininginfo",
        params: "",
        id: 1,
      });
      if (!a.data.Result) throw new Error("No result");
      if (!a.data.Result.MiningPublickey) throw new Error("No public key");
      if (typeof a.data.Result.MiningPublickey !== "string") throw new Error("Public key is not a string");

      const real = a.data.Result.MiningPublickey;
      const db = node.validatorPublic;

      if (real !== db)
        await sendHTMLMessage(
          `The public key of <code>${node.dockerIndex}</code> is not equal to the one in the database.\n\n` +
            `DB: <code>${db}<code/>\n` +
            `Real: <code>${real}<code/>`
        );
    } catch {
      //
    }
  }
}
