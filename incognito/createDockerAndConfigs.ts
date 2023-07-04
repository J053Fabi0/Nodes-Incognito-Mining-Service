import { ObjectId } from "mongo/mod.ts";
import createDocker from "./docker/createDocker.ts";
import constants, { adminId } from "../constants.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { createNode, getNodes } from "../controllers/node.controller.ts";
import createNginxConfig, { CreateNginxConfigResponse } from "./nginx/createNginxConfig.ts";

export interface CreateDockerAndConfigsOptions {
  clientId: string | ObjectId;
  number: number;
  rcpPort?: number;
  validator: string;
  inactive?: boolean;
  dockerIndex?: number;
  validatorPublic: string;
}

export interface CreateDockerAndConfigsReturn {
  nodeId: ObjectId;
  dockerIndex: number;
  url: CreateNginxConfigResponse["url"];
  name: CreateNginxConfigResponse["name"];
}

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function createDockerAndConfigs({
  number,
  clientId,
  validator,
  validatorPublic,
  inactive = false,
  ...optionals
}: CreateDockerAndConfigsOptions): Promise<CreateDockerAndConfigsReturn> {
  const { rcpPort, dockerIndex } = await (async function (): Promise<Required<typeof optionals>> {
    if (optionals.rcpPort && optionals.dockerIndex)
      return { rcpPort: optionals.rcpPort, dockerIndex: optionals.dockerIndex };

    const nodes = await getNodes({}, { projection: { _id: 0, rcpPort: 1, dockerIndex: 1 } });

    const rcpPort = optionals.rcpPort ?? Math.max(...nodes.map((n) => n.rcpPort)) + 1;
    const dockerIndex = optionals.dockerIndex ?? Math.max(...nodes.map((n) => n.dockerIndex)) + 1;

    return { rcpPort, dockerIndex };
  })();

  const clientIdStr = clientId.toString();

  const { name, url } = await createNginxConfig(clientIdStr, number, rcpPort);
  await createDocker(rcpPort, validator, dockerIndex);

  // Create node in the database
  const newNode = await createNode({
    name,
    number,
    rcpPort,
    inactive,
    validator,
    dockerIndex,
    validatorPublic,
    client: new ObjectId(clientId),
    sendTo: [adminId, new ObjectId(clientId)],
  });

  // Update configurations only if the node is active
  if (inactive === false) addNodeToConfigs(dockerIndex, name, validatorPublic);

  return { name, url, nodeId: newNode._id, dockerIndex };
}

export function addNodeToConfigs(dockerIndex: number, name: string, validatorPublic: string) {
  duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
  constants.push({ name, dockerIndex, validatorPublic });
}
