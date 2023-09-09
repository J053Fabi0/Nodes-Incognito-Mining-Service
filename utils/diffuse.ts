import updateDockers from "../crons/updateDockers.ts";
import sortNodes from "./sortNodes.ts";

const alreadyDone = [147, 193, 269, 206];

export default async function diffuse() {
  const { nodesInfoByDockerIndex: nodesInfo } = await sortNodes(undefined, {
    fullData: false,
    fromCacheIfConvenient: true,
  });

  await updateDockers({
    force: true,
    dockerIndexes: nodesInfo.map(([n]) => +n).filter((n) => !alreadyDone.includes(n)),
  });
}
