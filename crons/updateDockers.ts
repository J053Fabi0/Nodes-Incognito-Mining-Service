import { sleep } from "sleep";
import Node from "../types/collections/node.type.ts";
import getLatestTag from "../incognito/getLatestTag.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import getShouldBeOnline from "../utils/getShouldBeOnline.ts";
import deleteDocker from "../incognito/docker/deleteDocker.ts";
import createDocker from "../incognito/docker/createDocker.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { changeNode, getNodes } from "../controllers/node.controller.ts";
import { docker } from "duplicatedFilesCleanerIncognito";

export let updatingDockers = false;
let instanceRunning = false;

export default async function updateDockers() {
  if (instanceRunning) return;
  instanceRunning = true;

  const latestTag = await getLatestTag();
  const nodes = await getNodes({ inactive: false });
  const nodesInfo = await duplicatedFilesCleaner.getInfo(nodes.map((n) => n.dockerIndex));

  for (const node of nodes) {
    const info = nodesInfo[node.dockerIndex];

    if (info.docker.tag === latestTag) {
      if (node.dockerTag !== latestTag) await updateTagInDB(node);
      continue;
    }

    // const [nodeStatus] = await getNodesStatus({ dockerIndexes: [node.dockerIndex], fullData: false });
    // if (!getShouldBeOnline(nodeStatus)) {
    console.log(`Updating node ${node.dockerIndex} from ${info.docker.tag} to ${latestTag}`);
    updatingDockers = true;

    await deleteDocker(node.dockerIndex, false);
    await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex).catch(console.error);
    await docker(`inc_mainnet_${node.dockerIndex}`, "stop").catch(console.error);

    await updateTagInDB(node);

    console.log("Waiting 20 seconds to continue updating dockers.");
    updatingDockers = false;
    await sleep(20);
    // }
  }

  updatingDockers = false;
  instanceRunning = false;
}

async function updateTagInDB(node: Node) {
  const { [node.dockerIndex]: nodeInfo } = await duplicatedFilesCleaner.getInfo([node.dockerIndex]);
  await changeNode({ _id: node._id }, { $set: { dockerTag: nodeInfo.docker.tag } });
}
