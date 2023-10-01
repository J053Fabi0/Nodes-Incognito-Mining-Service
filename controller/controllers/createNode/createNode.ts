import { Context } from "cheetah";
import { ObjectId } from "mongo/mod.ts";
import getLatestTag from "./getLatestTag.ts";
import deleteDocker from "./docker/deleteDocker.ts";
import createDocker from "./docker/createDocker.ts";
import isError from "../../../types/guards/isError.ts";
import constants, { adminId } from "../../constants.ts";
import getNodeName from "../../../utils/getNodeName.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";
import getBlockchainInfo from "../../../incognito/getBlockchainInfo.ts";
import getPublicValidatorKey from "../../../utils/getPublicValidatorKey.ts";
import { getServerWithLessNodes } from "../../../controllers/server.controller.ts";
import repeatUntilNoError from "../../../duplicatedFilesCleaner/utils/repeatUntilNoError.ts";
import { changeNode, createNode as createNodeCtrl, getNodes } from "../../../controllers/node.controller.ts";

export interface CreateNodeBody {
  number: number;
  clientId: string;
  rcpPort?: number;
  /** If there's already a node in DB, change it instead of creating a new one */
  nodeId?: string;
  validator: string;
  inactive?: boolean;
  dockerIndex?: number;
  validatorPublic?: string;
}

export interface CreateNodeResponse {
  name: string;
  nodeId: string;
  dockerIndex: number;
  validatorPublic: string;
}

/**
 * It completely creates a new node, including docker, nginx config, node in the database and update configurations
 */
export default async function createNode(c: Context) {
  let {
    number,
    nodeId,
    clientId,
    validator,
    validatorPublic,
    inactive = false,
    ...optionals
  } = (await c.req.json()) as CreateNodeBody;

  const portAndIndex = await (async function (): Promise<Required<typeof optionals>> {
    if (optionals.rcpPort && optionals.dockerIndex)
      return { rcpPort: optionals.rcpPort, dockerIndex: optionals.dockerIndex };

    const nodes = await getNodes({}, { projection: { _id: 0, rcpPort: 1, dockerIndex: 1 } });

    const rcpPort = optionals.rcpPort ?? Math.max(...nodes.map((n) => n.rcpPort)) + 1;
    const dockerIndex = optionals.dockerIndex ?? Math.max(...nodes.map((n) => n.dockerIndex)) + 1;

    return { rcpPort, dockerIndex };
  })();

  const clientIdStr = clientId.toString();
  const latestTag = await getLatestTag();

  while (true)
    try {
      await createDocker(portAndIndex.rcpPort, validator, portAndIndex.dockerIndex, latestTag);
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

  const name = getNodeName(clientIdStr, number);
  const validatorPublicForSure = validatorPublic || (await getPublicValidatorKey(name, portAndIndex.dockerIndex));

  if (nodeId)
    // Update node in the database
    await changeNode(
      { _id: new ObjectId(nodeId) },
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
  else {
    const info = (await repeatUntilNoError(
      async () => {
        const infoAttempt = await getBlockchainInfo();
        if (!infoAttempt) throw new Error("info is null");
        return infoAttempt;
      },
      60,
      10
    ))!;

    nodeId = (
      await createNodeCtrl({
        name,
        number,
        inactive,
        validator,
        dockerTag: latestTag,
        rcpPort: portAndIndex.rcpPort,
        client: new ObjectId(clientId),
        epoch: info.BestBlocks["-1"].Epoch,
        dockerIndex: portAndIndex.dockerIndex,
        validatorPublic: validatorPublicForSure,
        sendTo: [adminId, new ObjectId(clientId)],
        server: (await getServerWithLessNodes())._id,
      })
    )._id.toString();
  }

  // Update configurations only if the node is active
  if (inactive === false) addNodeToConfigs(portAndIndex.dockerIndex, name, validatorPublicForSure);

  c.res.body = { name, nodeId, dockerIndex: portAndIndex.dockerIndex, validatorPublic: validatorPublicForSure };
}

export function addNodeToConfigs(dockerIndex: number, name: string, validatorPublic: string) {
  duplicatedFilesCleaner.dockerIndexes.push(dockerIndex);
  constants.push({ name, dockerIndex, validatorPublic });
}
