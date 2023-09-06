import getPublicKey from "../incognito/getPublicKey.ts";
import getRewardAddress from "../incognito/getRewardAddress.ts";
import { changeNode, getNodes } from "../controllers/node.controller.ts";

export default async function getMissingKeys() {
  const nodes = await getNodes(
    { $or: [{ publicKey: { $exists: false } }, { rewardAddress: { $exists: false } }] },
    { projection: { validatorPublic: 1, publicKey: 1, rewardAddress: 1, _id: 1 } }
  );
  console.log(nodes);

  for (const node of nodes) {
    let publicKey = node.publicKey || null;
    if (!publicKey) {
      publicKey = await getPublicKey(node.validatorPublic);
      if (publicKey) await changeNode({ _id: node._id }, { $set: { publicKey } });
    }

    if (!publicKey) continue;

    let rewardAddress = node.rewardAddress || null;
    if (!rewardAddress) {
      rewardAddress = await getRewardAddress(publicKey);
      if (rewardAddress) await changeNode({ _id: node._id }, { $set: { rewardAddress } });
    }
  }
}
