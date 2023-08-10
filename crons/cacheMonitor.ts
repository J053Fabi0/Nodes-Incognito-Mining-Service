import sortNodes from "../utils/sortNodes.ts";

/** Update the cache for every node */
export default function cacheMonitor() {
  return sortNodes(undefined, { fullData: true });
}
