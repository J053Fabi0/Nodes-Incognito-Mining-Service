import { sleep } from "sleep";
import Node from "../types/collections/node.type.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { changeNode, getNodes } from "../controllers/node.controller.ts";
import getLatestTag from "../controller/controllers/createNode/getLatestTag.ts";
import createDocker from "../controller/controllers/createNode/docker/createDocker.ts";
import deleteDocker from "../controller/controllers/createNode/docker/deleteDocker.ts";

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

    console.log(`Updating node ${node.dockerIndex} from ${info.docker.tag} to ${latestTag}`);
    updatingDockers = true;

    await deleteDocker(node.dockerIndex, false);
    await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex).catch(console.error);
    // stop the docker if it was stopped before
    if (!info.docker.running) await docker(`inc_mainnet_${node.dockerIndex}`, "stop").catch(console.error);

    await updateTagInDB(node);

    console.log("Waiting 20 seconds to continue updating dockers.");
    updatingDockers = false;
    await sleep(20);
  }

  updatingDockers = false;
  instanceRunning = false;
}

async function updateTagInDB(node: Node) {
  const { [node.dockerIndex]: nodeInfo } = await duplicatedFilesCleaner.getInfo([node.dockerIndex]);
  await changeNode({ _id: node._id }, { $set: { dockerTag: nodeInfo.docker.tag } });
}
