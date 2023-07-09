import handleError from "../utils/handleError.ts";
import { nodesStatistics } from "../utils/variables.ts";
import getNodesStatistics, { NodesStatistics } from "../utils/getNodesStatistics.ts";

export default async function cacheNodesStatistics() {
  const data = await getNodesStatistics();
  for (const key of Object.keys(data) as (keyof NodesStatistics)[]) {
    switch (key) {
      case "monthsLabels":
        nodesStatistics[key] = data[key];
        break;
      case "nodesByMonth":
        nodesStatistics[key] = data[key];
        break;
      case "earningsByMonth":
        nodesStatistics[key] = data[key];
        break;
      case "averageTotalEarningsByMonth":
        nodesStatistics[key] = data[key];
        break;
      case "earningsCount":
        nodesStatistics[key] = data[key];
        break;
      case "nodesCount":
        nodesStatistics[key] = data[key];
        break;
      default:
        nodesStatistics[key] = data[key];
    }
  }
}

// run once at startup
cacheNodesStatistics().catch(handleError);
