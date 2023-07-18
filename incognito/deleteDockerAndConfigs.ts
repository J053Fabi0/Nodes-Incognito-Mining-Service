import { ObjectId } from "mongo/mod.ts";
import constants from "../constants.ts";
import deleteDocker from "./docker/deleteDocker.ts";
import deleteNginxConfig from "./nginx/deleteNginxConfig.ts";
import { changeNode } from "../controllers/node.controller.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { lastErrorTimes, lastRoles, syncedNodes } from "../utils/variables.ts";

interface DeleteDockerAndConfigsOptions {
  number: number;
  dockerIndex: number;
  clientId: string | ObjectId;
}

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function deleteDockerAndConfigs({
  number,
  clientId,
  dockerIndex,
}: DeleteDockerAndConfigsOptions): Promise<void> {
  // Delete docker, files and nginx config
  await deleteDocker(dockerIndex);
  await deleteNginxConfig(clientId, number);

  // Set as inactive
  await changeNode({ dockerIndex }, { $set: { inactive: true } });

  // Remove from constants
  removeNodeFromConfigs(dockerIndex);
}

export function removeNodeFromConfigs(dockerIndex: number) {
  {
    const index = duplicatedFilesCleaner.dockerIndexes.findIndex((i) => i === dockerIndex);
    if (index !== -1) duplicatedFilesCleaner.dockerIndexes.splice(index, 1);
  }

  {
    const index = constants.findIndex((i) => i.dockerIndex === dockerIndex);
    if (index !== -1) {
      const [{ validatorPublic }] = constants.splice(index, 1);
      delete lastErrorTimes[validatorPublic];
      delete syncedNodes[validatorPublic];
    }
  }

  delete lastRoles[dockerIndex];
}
