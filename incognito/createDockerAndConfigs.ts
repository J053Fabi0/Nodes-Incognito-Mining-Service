import { ObjectId } from "mongo/mod.ts";
import createDocker from "./docker/createDocker.ts";
import constants, { adminId } from "../constants.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { createNode, getNodes } from "../controllers/node.controller.ts";
import createNginxConfig, { CreateNginxConfigResponse } from "./nginx/createNginxConfig.ts";

interface CreateDockerAndConfigsOptions {
  clientId: string | ObjectId;
  number: number;
  rcpPort?: number;
  validator: string;
  dockerIndex?: number;
  validatorPublic: string;
}

interface CreateDockerAndConfigsReturn {
  nodeId: ObjectId;
  url: CreateNginxConfigResponse["url"];
  name: CreateNginxConfigResponse["name"];
}

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function createDockerAndConfigs({
  clientId,
  number,
  validator,
  validatorPublic,
  ...optionals
}: CreateDockerAndConfigsOptions): Promise<CreateDockerAndConfigsReturn> {
  const { rcpPort, dockerIndex } = await (async function (): Promise<Required<typeof optionals>> {
    if (optionals.rcpPort && optionals.dockerIndex)
      return { rcpPort: optionals.rcpPort, dockerIndex: optionals.dockerIndex };

    const nodes = await getNodes({}, { projection: { _id: 0, rcpPort: 1, dockerIndex: 1 } });

    const rcpPort = optionals.rcpPort ?? nodes.map((n) => n.rcpPort).sort((a, b) => b - a)[0] + 1;
    const dockerIndex = optionals.dockerIndex ?? nodes.map((n) => n.dockerIndex).sort((a, b) => b - a)[0] + 1;

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
    validator,
    dockerIndex,
    validatorPublic,
    inactive: false,
    client: new ObjectId(clientId),
    sendTo: [adminId, new ObjectId(clientId)],
  });

  // Update configurations
  duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
  constants.push({ name, dockerIndex, validatorPublic });

  return { name, url, nodeId: newNode._id };
}
