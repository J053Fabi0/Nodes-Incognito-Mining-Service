// deno-lint-ignore-file no-unused-vars
import Constants from "./src/types/constants.type.ts";
import { AllErrorTypes } from "./src/utils/variables.ts";

const constants: Constants = [
  {
    name: "",
    dockerIndex: 0,
    publicValidatorKey: "",
  },
];

export default constants;

const MINUTE = 1;
const HOUR = 60;
const DAY = 1440;

// In minutes
export const waitingTimes: Record<AllErrorTypes, number> = {
  alert: 10 * MINUTE,
  offline: 15 * MINUTE,
  unsynced: 20 * MINUTE,
  isOldVersion: 1 * DAY,
  isSlashed: 0 * MINUTE,
  stalling: 5 * MINUTE,
  lowDiskSpace: 0 * MINUTE,
};

export const minEpochsToBeOnline = 5;
export const minEpochsToLetSync = 20;
export const maxDiskPercentageUsage = 95;
