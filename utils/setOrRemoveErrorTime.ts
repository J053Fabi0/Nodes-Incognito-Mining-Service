import { AllErrorTypes, ErrorInfo } from "./variables.ts";

/**
 * Sets or deletes an error time
 * @param set Did the error is present? Set to true if it is, false if it is not
 */
export default function setOrRemoveErrorTime(
  set: boolean,
  lastErrorTime: Partial<Record<AllErrorTypes, ErrorInfo>>,
  errorKey: AllErrorTypes
): void {
  if (set) {
    if (!lastErrorTime[errorKey]) lastErrorTime[errorKey] = { startedAt: Date.now(), notifiedAt: 0 };
  } else delete lastErrorTime[errorKey];
}
