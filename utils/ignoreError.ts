import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import isGlobalErrorType from "../types/guards/isGlobalErrorType.ts";
import { AllIgnoreTypes, GlobalErrorTypes, allIgnoreTypes, ignore } from "./variables.ts";

/** Ignores a global error. */
export default function ignoreError(type: GlobalErrorTypes, minutes: number): void;
/** Ignores all types of errors for all nodes. */
export default function ignoreError(type: "all", minutes: number): void;
/** Ignore all non-global errors for one node, many nodes or `"all"` nodes. */
export default function ignoreError(
  type: "all",
  dockerIndex: number | (number | string)[] | "all",
  minutes: number
): void;
/** Ignore a specific error for one node, many nodes or `"all"` nodes. */
export default function ignoreError(
  type: Exclude<AllIgnoreTypes, GlobalErrorTypes>,
  dockerIndex: number | (number | string)[] | "all",
  minutes: number
): void;

export default function ignoreError(
  type: AllIgnoreTypes | "all",
  dockerIndex: number | (number | string)[] | "all",
  minutes?: number
): void {
  // Ignoring all errors for all nodes
  if (type === "all" && minutes === undefined) {
    if (typeof dockerIndex !== "number") throw new Error("minutes is required to be number for global errors.");
    minutes = dockerIndex;
    for (const key of allIgnoreTypes) {
      if (isGlobalErrorType(key)) ignoreError(key, minutes);
      else ignoreError(key, "all", minutes);
    }
    return;
  }

  // Ignoring global errors
  if (isGlobalErrorType(type)) {
    if (typeof dockerIndex !== "number") throw new Error("minutes is required to be number for global errors.");
    ignore[type] = { from: Date.now(), minutes: dockerIndex };
    return;
  }

  if (minutes === undefined) throw new Error("minutes is required to be defined for non-global errors.");

  // Ignoring all errors
  if (type === "all") {
    for (const key of allIgnoreTypes) {
      if (isGlobalErrorType(key)) continue;
      ignoreError(key, dockerIndex, minutes);
    }
    return;
  }

  // Ignoring all errors for one or many nodes
  if (dockerIndex === "all") {
    for (const dI of duplicatedFilesCleaner.dockerIndexes) ignoreError(type, dI, minutes);
    return;
  }

  // Ignoring one error for one or many nodes
  for (const dI of Array.isArray(dockerIndex) ? dockerIndex : [dockerIndex]) {
    ignore[type][dI].from = Date.now();
    ignore[type][dI].minutes = minutes;
  }
}
