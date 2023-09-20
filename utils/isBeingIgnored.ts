import { GlobalErrorTypes, ignore } from "./variables.ts";
import isGlobalErrorType from "../types/guards/isGlobalErrorType.ts";

export default function isBeingIgnored(errorType: GlobalErrorTypes): boolean;
export default function isBeingIgnored(
  errorType: Exclude<keyof typeof ignore, GlobalErrorTypes>,
  dockerIndex: number | string
): boolean;
export default function isBeingIgnored(errorType: keyof typeof ignore, dockerIndex?: number | string): boolean {
  const isGlobal = isGlobalErrorType(errorType);
  if (!isGlobal && dockerIndex === undefined) throw new Error("dockerIndex is required for non global errors.");

  const errorInfo = isGlobal ? ignore[errorType] : ignore[errorType][dockerIndex!];

  return (errorInfo?.from ?? 0) + (errorInfo?.minutes ?? 0) * 60 * 1000 > Date.now();
}
