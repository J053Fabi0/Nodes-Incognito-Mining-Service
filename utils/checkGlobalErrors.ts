import getDiskUsage from "./getDiskUsage.ts";
import { lastGlobalErrorTimes } from "./variables.ts";
import { maxDiskPercentageUsage } from "../constants.ts";
import setOrRemoveErrorTime from "./setOrRemoveErrorTime.ts";

export default async function checkGlobalErrors() {
  {
    // Check if the file system is at or above the maximum acceptable percentage
    const percentage = await getDiskUsage();
    if (percentage !== null)
      setOrRemoveErrorTime(percentage >= maxDiskPercentageUsage, lastGlobalErrorTimes, "lowDiskSpace");
  }
}
