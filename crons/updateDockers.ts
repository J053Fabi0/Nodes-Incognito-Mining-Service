import { sleep } from "sleep";
import { join } from "std/path/mod.ts";
import handleError from "../utils/handleError.ts";
import Node from "../types/collections/node.type.ts";
import doesDirExists from "../utils/doesDirExists.ts";
import getNodesStatus from "../utils/getNodesStatus.ts";
import { docker } from "duplicatedFilesCleanerIncognito";
import { maxPromises } from "duplicatedFilesCleanerIncognito";
import { changeNode, getNodes } from "../controllers/node.controller.ts";
import { addNodeToConfigs } from "../incognito/createDockerAndConfigs.ts";
import duplicatedFilesCleaner from "../controller/duplicatedFilesCleaner.ts";
import { removeNodeFromConfigs } from "../incognito/deleteDockerAndConfigs.ts";
import getLatestTag from "../controller/controllers/createNode/getLatestTag.ts";
import deleteDocker from "../controller/controllers/createNode/docker/deleteDocker.ts";
import createDocker, { dataDir } from "../controller/controllers/createNode/docker/createDocker.ts";

let instanceRunning = false;

interface UpdateDockersOptions {
  force?: boolean;
  dockerIndexes?: number[];
}

async function createTempDataDir() {
  const tempDirName = Math.random().toString(36).slice(2);
  const fullPath = join(duplicatedFilesCleaner.homePath, "temp", tempDirName);
  await Deno.mkdir(fullPath, { recursive: true });
  return { fullPath, tempDirName };
}

export default async function updateDockers({ force = false, dockerIndexes }: UpdateDockersOptions = {}) {
  if (instanceRunning) return;
  instanceRunning = true;

  const latestTag = await getLatestTag();

  const nodesQuery: Parameters<typeof getNodes>[0] = { inactive: false };
  if (dockerIndexes) nodesQuery.dockerIndex = { $in: dockerIndexes };
  const nodes = await getNodes(nodesQuery);
  if (!nodes.length) return;

  const nodesInfo = await duplicatedFilesCleaner.getInfo(nodes.map((n) => n.dockerIndex));

  await maxPromises(
    nodes.map((node) => async () => {
      try {
        const info = nodesInfo[node.dockerIndex];

        if (info.docker.tag === latestTag && !force) {
          if (node.dockerTag !== latestTag) await updateTagInDB(node);
          return;
        }

        console.log(`Updating node ${node.dockerIndex} from ${info.docker.tag} to ${latestTag}`);

        // save the beacon and shard files somewhere else
        const tempDir = await createTempDataDir().then((dir) => dir.fullPath);
        const blockDir = `${dataDir}_${node.dockerIndex}/mainnet/block`;
        const tempBlockDir = join(tempDir, "block");
        const backup = await doesDirExists(blockDir);
        if (backup) await Deno.rename(blockDir, tempBlockDir);

        // delete and recreate the docker
        await changeNode({ _id: node._id }, { $set: { inactive: true } });
        removeNodeFromConfigs(node.dockerIndex);
        await deleteDocker(node.dockerIndex);
        await createDocker(node.rcpPort, node.validatorPublic, node.dockerIndex);

        // wait for it to be online in the monitor
        await (async (timedout = false) => {
          await Promise.race([
            (async () => {
              while (!timedout) {
                const [nodeStatus] = await getNodesStatus({ dockerIndexes: [node.dockerIndex] });
                if (nodeStatus?.status === "ONLINE") break;
                await sleep(1);
              }
            })(),
            sleep(60 * 5).finally(() => {
              timedout = true;
              console.error(new Error(`Node ${node.dockerIndex} did not come online in 5 minutes.`));
            }),
          ]);
        })();

        // restore backup
        thisIf: if (backup) {
          // wait until a new block dir is created
          const doesExist = await (async (timedout = false, doesExist = false) => {
            await Promise.race([
              (async () => {
                while (!timedout) {
                  if ((doesExist = await doesDirExists(blockDir))) break;
                  await sleep(1);
                }
              })(),
              sleep(120).finally(() => (timedout = true)),
            ]);
            return doesExist;
          })();

          if (!doesExist) {
            console.error(
              new Error(`The new block dir was not created in 120 seconds for node ${node.dockerIndex}.`)
            );
            break thisIf;
          }

          // stop the docker
          await docker(`inc_mainnet_${node.dockerIndex}`, "stop");

          // delete the new block dir
          await Deno.remove(blockDir, { recursive: true });

          // move the backup to the new block dir
          await Deno.rename(tempBlockDir, blockDir);

          // start the docker
          await docker(`inc_mainnet_${node.dockerIndex}`, "start");
        }

        // stop the docker if it was stopped before
        if (!info.docker.running) await docker(`inc_mainnet_${node.dockerIndex}`, "stop");

        await changeNode({ _id: node._id }, { $set: { inactive: false } });
        addNodeToConfigs(node.dockerIndex, node.name, node.validatorPublic);
        await Deno.remove(tempDir, { recursive: true }).catch(handleError);

        await updateTagInDB(node);
      } catch (e) {
        await handleError(e);
      }
    }),
    3
  );

  instanceRunning = false;
}

async function updateTagInDB(node: Node) {
  const { [node.dockerIndex]: nodeInfo } = await duplicatedFilesCleaner.getInfo([node.dockerIndex]);
  await changeNode({ _id: node._id }, { $set: { dockerTag: nodeInfo.docker.tag } });
}
