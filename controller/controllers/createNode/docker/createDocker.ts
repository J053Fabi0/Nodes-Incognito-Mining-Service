import { join } from "std/path/mod.ts";
import getLatestTag from "../getLatestTag.ts";
import { infuraURL } from "../../../constants.ts";
import { docker } from "../../../../utils/commands.ts ";
import duplicatedFilesCleaner from "../../../duplicatedFilesCleaner.ts";

const nodePortDiff = 1099; // nodePort is 1099 more than rpcPort
/** The dataDir without the _${dockerIndex} part, which has to be concatenated. */
export const dataDir = join(duplicatedFilesCleaner.homePath, "node_data");
const bootnode = "mainnet-bootnode.incognito.org:9330";
const coinIndexAccessToken = "edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb";

/**
 * @returns The container id
 */
export default async function createDocker(
  rpcPort: number,
  validatorKey: string,
  dockerIndex: number,
  dockerTag: string | Promise<string> = getLatestTag()
) {
  // Run even if it fails, in case it already exists
  await docker(["network", "create", "--driver", "bridge", "inc_net"]).catch(() => {});

  const nodePort = rpcPort + nodePortDiff;

  return docker([
    "run",
    "--restart=no",
    ...["--net", "inc_net"],
    ...["-p", `${nodePort}:${nodePort}`],
    ...["-p", `${rpcPort}:${rpcPort}`],
    ...["-e", `NODE_PORT=${nodePort}`],
    ...["-e", `RPC_PORT=${rpcPort}`],
    ...["-e", `BOOTNODE_IP=${bootnode}`],
    ...["-e", `GETH_NAME=${infuraURL}`],
    ...["-e", `MININGKEY=${validatorKey}`],
    ...["-e", "TESTNET=false"],
    ...["-e", `INDEXER_ACCESS_TOKEN=${coinIndexAccessToken}`],
    ...["-e", "NUM_INDEXER_WORKERS=0"],
    ...["-v", `${dataDir}_${dockerIndex}:/data`],
    "-d",
    ...["--name", `inc_mainnet_${dockerIndex}`],
    `incognitochain/incognito-mainnet:${await dockerTag}`,
  ]);
}
