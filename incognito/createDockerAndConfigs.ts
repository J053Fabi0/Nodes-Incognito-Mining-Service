import { ObjectId } from "mongo/mod.ts";
import isError from "../types/guards/isError.ts";
import getNodeName from "../utils/getNodeName.ts";
import createDocker from "./docker/createDocker.ts";
import deleteDocker from "./docker/deleteDocker.ts";
import constants, { adminId } from "../constants.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import getPublicValidatorKey from "../utils/getPublicValidatorKey.ts";
import { changeNode, createNode, getNodes } from "../controllers/node.controller.ts";
import createNginxConfig, { CreateNginxConfigResponse } from "./nginx/createNginxConfig.ts";

export interface CreateDockerAndConfigsOptions {
  clientId: string | ObjectId;
  number: number;
  rcpPort?: number;
  /** If there's already a node in DB, change it instead of creating a new one */
  nodeId?: ObjectId;
  validator: string;
  inactive?: boolean;
  dockerIndex?: number;
  validatorPublic?: string;
}

export interface CreateDockerAndConfigsReturn {
  nodeId: ObjectId;
  dockerIndex: number;
  validatorPublic: string;
  url: CreateNginxConfigResponse["url"];
  name: CreateNginxConfigResponse["name"];
}

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function createDockerAndConfigs({
  number,
  nodeId,
  clientId,
  validator,
  validatorPublic,
  inactive = false,
  ...optionals
}: CreateDockerAndConfigsOptions): Promise<CreateDockerAndConfigsReturn> {
  const portAndIndex = await (async function (): Promise<Required<typeof optionals>> {
    if (optionals.rcpPort && optionals.dockerIndex)
      return { rcpPort: optionals.rcpPort, dockerIndex: optionals.dockerIndex };

    const nodes = await getNodes({}, { projection: { _id: 0, rcpPort: 1, dockerIndex: 1 } });

    const rcpPort = optionals.rcpPort ?? Math.max(...nodes.map((n) => n.rcpPort)) + 1;
    const dockerIndex = optionals.dockerIndex ?? Math.max(...nodes.map((n) => n.dockerIndex)) + 1;

    return { rcpPort, dockerIndex };
  })();

  const clientIdStr = clientId.toString();

  while (true)
    try {
      await createDocker(portAndIndex.rcpPort, validator, portAndIndex.dockerIndex);
      break;
    } catch (e) {
      if (!isError(e)) throw e;
      if (e.message.includes("address already in use")) {
        console.error(`Port ${portAndIndex.rcpPort} is already in use, trying with the next one...`);
        portAndIndex.rcpPort++;
        continue;
      } else if (e.message.includes("is already in use by container")) {
        console.error(`Docker index ${portAndIndex.dockerIndex} is already in use, trying to delete it.`);
        await deleteDocker(portAndIndex.dockerIndex);
      } else throw e;
    }

  const { name, url } = await createNginxConfig(clientIdStr, number, portAndIndex.rcpPort);

  const validatorPublicForSure = validatorPublic || (await getPublicValidatorKey(name, portAndIndex.dockerIndex));

  if (nodeId)
    // Update node in the database
    await changeNode(
      { _id: nodeId },
      {
        $set: {
          // the only fields that don't change are validator and validatorPublic
          name,
          number,
          inactive,
          rcpPort: portAndIndex.rcpPort,
          client: new ObjectId(clientId),
          dockerIndex: portAndIndex.dockerIndex,
          sendTo: [adminId, new ObjectId(clientId)],
        },
      }
    );
  // Create node in the database
  else
    nodeId = (
      await createNode({
        name,
        number,
        inactive,
        validator,
        rcpPort: portAndIndex.rcpPort,
        client: new ObjectId(clientId),
        dockerIndex: portAndIndex.dockerIndex,
        validatorPublic: validatorPublicForSure,
        sendTo: [adminId, new ObjectId(clientId)],
      })
    )._id;

  // Update configurations only if the node is active
  if (inactive === false) addNodeToConfigs(portAndIndex.dockerIndex, name, validatorPublicForSure);

  return { name, url, nodeId, dockerIndex: portAndIndex.dockerIndex, validatorPublic: validatorPublicForSure };
}

export function addNodeToConfigs(dockerIndex: number, name: string, validatorPublic: string) {
  duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
  constants.push({ name, dockerIndex, validatorPublic });
}
