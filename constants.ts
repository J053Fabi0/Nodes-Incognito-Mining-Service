// deno-lint-ignore-file no-unused-vars

import Constants from "./src/types/constants.type.ts";
import { AllErrorTypes } from "./src/utils/variables.ts";
import { getNodes } from "./src/controllers/node.controller.ts";

const nodes = await getNodes();

const constants: Constants = nodes.map((node) => ({
  name: node.name,
  dockerIndex: node.dockerIndex,
  validatorPublic: node.validatorPublic,
}));

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
export const prvDecimalsDivisor = 1_000_000_000;
