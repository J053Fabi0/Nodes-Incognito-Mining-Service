import sortNodes from "../utils/sortNodes.ts";
import shouldContinueRefreshingMonitorInfo from "../utils/shouldContinueRefreshingMonitorInfo.ts";

/** Update the cache for every node */
export default async function cacheMonitor() {
  if (shouldContinueRefreshingMonitorInfo()) {
    await sortNodes(undefined, { fullData: true });
  }
}
