import { NodeRoles } from "./getNodesStatus.ts";
import getProxyAndRedisValue from "./getProxyAndRedisValue.ts";

export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling" | "unsynced";
export const errorTypes = [
  "alert",
  "offline",
  "stalling",
  "unsynced",
  "isSlashed",
  "isOldVersion",
] as ErrorTypes[];

export type GlobalErrorTypes = "lowDiskSpace";
export const globalErrorTypes: GlobalErrorTypes[] = ["lowDiskSpace"];

export type AllErrorTypes = ErrorTypes | GlobalErrorTypes;
export const allErrorTypes: readonly AllErrorTypes[] = [...errorTypes, ...globalErrorTypes];

export type LastErrorTime = Partial<Record<ErrorTypes, number>>;
// Node's public validator key as key of lastErrorTimes
export const lastErrorTimes = await getProxyAndRedisValue<Record<string, LastErrorTime>>("lastErrorTimes", {});

export type LastGlobalErrorTime = Partial<Record<GlobalErrorTypes, number>>;
export const lastGlobalErrorTimes = await getProxyAndRedisValue<LastGlobalErrorTime>("lastGlobalErrorTimes", {});

export type Ignore = Record<AllErrorTypes | "docker" | "autoMove", { minutes: number; from: number }>;
export const ignore = await getProxyAndRedisValue<Ignore>("ignore", {
  alert: { minutes: 0, from: Date.now() },
  isSlashed: { minutes: 0, from: Date.now() },
  isOldVersion: { minutes: 0, from: Date.now() },
  offline: { minutes: 0, from: Date.now() },
  stalling: { minutes: 0, from: Date.now() },
  docker: { minutes: 0, from: Date.now() },
  autoMove: { minutes: 0, from: Date.now() },
  unsynced: { minutes: 0, from: Date.now() },
  lowDiskSpace: { minutes: 0, from: Date.now() },
});

/** Node's public validator key as key */
export const syncedNodes = await getProxyAndRedisValue<Record<string | number, boolean | undefined>>(
  "syncedNodes",
  {}
);

type LastRole = {
  date: number;
  client: string;
  role: NodeRoles;
  createdAt: number;
  nodeNumber: number;
  // the last day since that a warning has been send
  lastWarningDay?: number;
};
function isLastRole(a: unknown): a is LastRole {
  return typeof a === "object" && a !== null && "date" in a && "role" in a;
}
/** Docker index as key */
export const lastRoles = new Proxy(await getProxyAndRedisValue<Record<string, LastRole>>("lastRoles", {}), {
  get: (target, key) => {
    if (typeof key !== "string") return Reflect.get(target, key);
    const a = Reflect.get(target, key);
    if (!a) return (target[key] = {} as LastRole);
    return a;
  },
  set: (target, key, value) => {
    // only allow to set LastRole
    if (!isLastRole(value)) return false;
    // let symbol pass
    if (typeof key !== "string") return Reflect.set(target, key, value);
    // only let strings that represent a valid number
    if (isNaN(+key)) return false;
    // update if the new role is different from the old one or the old one is is a dummy one
    if (value.role !== lastRoles[key].role) return Reflect.set(target, key, value);
    return true;
  },
});
