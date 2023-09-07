import getLatestTag from "../incognito/getLatestTag.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import { getNodes } from "../controllers/node.controller.ts";
import getShouldBeOnline from "../utils/getShouldBeOnline.ts";
import deleteDocker from "../incognito/docker/deleteDocker.ts";
import createDocker from "../incognito/docker/createDocker.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";

export default async function updateDockers() {
  const latestTag = await getLatestTag();
  const outdatedNodes = await getNodes({ dockerTag: { $ne: latestTag } });
  const nodesInfo = await duplicatedFilesCleaner.getInfo(outdatedNodes.map((n) => n.dockerIndex));

  for (const node of outdatedNodes) {
    const info = nodesInfo[node.dockerIndex];
    if (info.docker.tag === latestTag) continue;

    const [nodeStatus] = await getNodesStatus({ dockerIndexes: [node.dockerIndex], fullData: false });

    if (!getShouldBeOnline(nodeStatus)) {
      await deleteDocker(node.dockerIndex, false);
      await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex);
    }
  }
}
