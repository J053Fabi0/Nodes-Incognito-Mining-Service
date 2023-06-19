import { ignore } from "./variables.ts";

// errorType is any key of ignore
export default function isBeingIgnored(errorType: keyof typeof ignore) {
  return ignore[errorType].from.getTime() + ignore[errorType].minutes * 60 * 1000 > Date.now();
}
