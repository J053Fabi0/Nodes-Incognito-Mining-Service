import { ObjectId } from "mongo/mod.ts";
import constants from "../constants.ts";
import deleteNginxConfig from "./nginx/deleteNginxConfig.ts";
import { changeNode } from "../controllers/node.controller.ts";
import duplicatedFilesCleaner from "../controller/duplicatedFilesCleaner.ts";
import { lastErrorTimes, lastRoles, onlineQueue } from "../utils/variables.ts";
import deleteDocker from "../controller/controllers/createNode/docker/deleteDocker.ts";

interface DeleteDockerAndConfigsOptions {
  number: number;
  dockerIndex: number;
  clientId: string | ObjectId;
}

export const dockersBeingDeleted: Record<string, true | undefined> = {};

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function deleteDockerAndConfigs({
  number,
  clientId,
  dockerIndex,
}: DeleteDockerAndConfigsOptions): Promise<void> {
  if (dockersBeingDeleted[dockerIndex]) return;
  dockersBeingDeleted[dockerIndex] = true;

  // Delete docker, files and nginx config
  await deleteDocker(dockerIndex);
  await deleteNginxConfig(clientId, number);

  // Set as inactive
  await changeNode({ dockerIndex }, { $set: { inactive: true } });

  // Remove from constants
  removeNodeFromConfigs(dockerIndex);

  setTimeout(() => {
    delete dockersBeingDeleted[dockerIndex];
  }, 30_000);
}

export function removeNodeFromConfigs(dockerIndex: number) {
  {
    const index = duplicatedFilesCleaner.dockerIndexes.findIndex((i) => i === dockerIndex);
    if (index !== -1) duplicatedFilesCleaner.dockerIndexes.splice(index, 1);
  }

  {
    const index = constants.findIndex((i) => i.dockerIndex === dockerIndex);
    if (index !== -1) {
      constants.splice(index, 1);
      delete lastErrorTimes[dockerIndex];

      for (const queue of Object.values(onlineQueue)) {
        const index = queue.findIndex((i) => i.dockerIndex === dockerIndex);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }
    }
  }

  delete lastRoles[dockerIndex];
}
