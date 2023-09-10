// import sortNodes from "./sortNodes.ts";
// import updateDockers from "../crons/updateDockers.ts";

import { lodash } from "lodash";
import { times } from "../crons/saveVariablesToRedis.ts";
import msToTimeDescription from "./msToTimeDescription.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";

// const alreadyDone = [147, 193, 269, 206];

export default async function diffuse() {
  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / times.length;
  const maxTime = lodash.max(times) ?? 0;
  const minTime = lodash.min(times) ?? 0;
  const options: Parameters<typeof msToTimeDescription>[1] = { short: true, includeMs: true };
  await sendHTMLMessage(
    "<code>" +
      `Average time: ${msToTimeDescription(averageTime, options)}.\n` +
      `Max time:     ${msToTimeDescription(maxTime, options)}.\n` +
      `Min time:     ${msToTimeDescription(minTime, options)}.\n` +
      `Total time:   ${msToTimeDescription(totalTime, options)}.\n` +
      `Total times:  ${times.length}.` +
      "</code>"
  );

  // const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodeStatus } = await sortNodes(undefined, {
  //   fullData: false,
  //   fromCacheIfConvenient: true,
  // });

  // await updateDockers({
  //   force: true,
  //   dockerIndexes: nodesInfo
  //     .filter(([n]) => nodeStatus[n]?.role !== "COMMITTEE")
  //     .map(([n]) => +n)
  //     .filter((n) => !alreadyDone.includes(n)),
  // });
}
