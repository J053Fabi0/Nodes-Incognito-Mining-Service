import Constants from "./src/types/constants.type.ts";
import { ErrorTypes } from "./src/utils/variables.ts";

const constants: Constants = [
  {
    name: "",
    publicValidatorKey: "",
  },
];

export default constants;

const MINUTE = 1;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

// In minutes
export const waitingTimes: Record<ErrorTypes, number> = {
  alert: 5 * MINUTE,
  offline: 15 * MINUTE,
  isOldVersion: 1 * DAY,
  isSlashed: 0 * MINUTE,
};

export const minEpochsToBeOnline = 15;
