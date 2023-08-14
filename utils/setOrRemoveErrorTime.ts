import { AllErrorTypes, ErrorInfo } from "./variables.ts";

export default function setOrRemoveErrorTime(
  set: boolean,
  lastErrorTime: Partial<Record<AllErrorTypes, ErrorInfo>>,
  errorKey: AllErrorTypes
): void {
  if (set) {
    if (!lastErrorTime[errorKey]) lastErrorTime[errorKey] = { startedAt: Date.now(), notifiedAt: 0 };
  } else delete lastErrorTime[errorKey];
}
