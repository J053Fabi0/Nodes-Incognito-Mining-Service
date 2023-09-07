import getLatestTag from "../incognito/getLatestTag.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import getShouldBeOnline from "../utils/getShouldBeOnline.ts";
import deleteDocker from "../incognito/docker/deleteDocker.ts";
import createDocker from "../incognito/docker/createDocker.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { changeNode, getNodes } from "../controllers/node.controller.ts";
import Node from "../types/collections/node.type.ts";

export let updatingDockers = false;

export default async function updateDockers() {
  if (updatingDockers) return;

  const latestTag = await getLatestTag();
  const outdatedNodes = await getNodes({ dockerTag: { $ne: latestTag }, inactive: false });
  const nodesInfo = await duplicatedFilesCleaner.getInfo(outdatedNodes.map((n) => n.dockerIndex));

  for (const node of outdatedNodes) {
    const info = nodesInfo[node.dockerIndex];

    if (info.docker.tag === latestTag) {
      await updateTagInDB(node);
      continue;
    }

    const [nodeStatus] = await getNodesStatus({ dockerIndexes: [node.dockerIndex], fullData: false });
    if (!getShouldBeOnline(nodeStatus)) {
      console.log(`Updating node ${node.dockerIndex} from ${info.docker.tag} to ${latestTag}`);
      updatingDockers = true;

      await deleteDocker(node.dockerIndex, false).catch(console.error);
      await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex).catch(console.error);

      await updateTagInDB(node);
    }
  }

  updatingDockers = false;
}

async function updateTagInDB(node: Node) {
  const { [node.dockerIndex]: nodeInfo } = await duplicatedFilesCleaner.getInfo([node.dockerIndex]);
  await changeNode({ _id: node._id }, { $set: { dockerTag: nodeInfo.docker.tag } });
}
