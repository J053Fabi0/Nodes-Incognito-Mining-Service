import { NodeStatus } from "./getNodesStatus.ts";
import { minEpochsToBeOnline, minEpochsToLetSync } from "../../constants.ts";
import { syncedNodes } from "./variables.ts";

const offlineRoles = ["PENDING", "SYNCING"];

const getShouldBeOffline = (
  nodeStatus: Partial<NodeStatus> &
    Pick<NodeStatus, "epochsToNextEvent" | "role" | "publicValidatorKey" | "syncState">
) => {
  const inSyncRange =
    minEpochsToLetSync >= nodeStatus.epochsToNextEvent && nodeStatus.epochsToNextEvent > minEpochsToBeOnline;

  if (inSyncRange && offlineRoles.includes(nodeStatus.role)) {
    // If it is synced and between the sync range, it should be offline
    if (syncedNodes[nodeStatus.publicValidatorKey]) return true;

    // Determine if the node is synced
    return (syncedNodes[nodeStatus.publicValidatorKey] = nodeStatus.syncState === "LATEST" && inSyncRange);
  }

  // Reset the synced status of the node
  syncedNodes[nodeStatus.publicValidatorKey] = false;

  nodeStatus.epochsToNextEvent > minEpochsToLetSync;

  // If the epochs to next event is greater than the min epochs to let sync and its only PENDING, it should be offline
  // In any other case, the node should be online
  return nodeStatus.epochsToNextEvent > minEpochsToLetSync && offlineRoles.includes(nodeStatus.role);
};

export default getShouldBeOffline;

// Test. All should log true.
// // it is synced and between the sync range
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 20,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "LATEST",
//   }) === true
// );

// // later on the node is offline and the syncState is unknown
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 20,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "-",
//   }) === true
// );

// // then the node is in commitee
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 4,
//     role: "COMMITTEE",
//     publicValidatorKey: "1",
//     syncState: "LATEST",
//   }) === false
// );

// // then the node is back in pending
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 80,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "LATEST",
//   }) === true
// );

// // then between the range again but offline, so it slouldn't be offline
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 20,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "-",
//   }) === false
// );

// // then the node is latest again
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 15,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "LATEST",
//   }) === true
// );

// // then it gets close to being in committee
// console.log(
//   getShouldBeOffline({
//     epochsToNextEvent: 5,
//     role: "PENDING",
//     publicValidatorKey: "1",
//     syncState: "-",
//   }) === false
// );
