import { NodeRoles } from "./getNodesStatus.ts";
import createTrueRecord from "./createTrueRecord.ts";
import { NodesStatistics } from "./getNodesStatistics.ts";
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
  /** The date in which the role changed */
  date: number;
  client: string;
  role: NodeRoles | "-";
  /** The creation date of the node */
  createdAt: number;
  nodeNumber: number;
  // the last day since that a warning has been send
  lastWarningDay?: number;
};
function isLastRole(a: unknown): a is LastRole {
  const keys: (keyof LastRole)[] = ["date", "client", "role", "createdAt", "nodeNumber"];
  return typeof a === "object" && a !== null && keys.map((k) => k in a).every((k) => k);
}
/** Docker index as key */
export const lastRoles = createTrueRecord(
  await getProxyAndRedisValue<Record<string, LastRole>>("lastRoles", {}),
  () => ({
    client: "",
    createdAt: 1,
    nodeNumber: 1,
    date: Date.now(),
    lastWarningDay: 1,
    role: "-" as const,
  }),
  (target, key, value) => {
    // only allow to set LastRole
    if (!isLastRole(value)) return false;
    // let symbol pass
    if (typeof key !== "string") return Reflect.set(target, key, value);
    // only let strings that represent a valid number
    if (isNaN(+key)) return false;
    // update if the new role is different from the old one or the old one is is a dummy one
    if (value.role !== lastRoles[key].role) return Reflect.set(target, key, value);
    return true;
  }
);

type PrvToPay = {
  usd: number;
  expires: number; // timestamp
  /** The prv it needs to give to host a new node. Decimal format */
  prvToPay: number;
  confirmed: boolean;
};
/** Client Id as key */
export const prvToPay = createTrueRecord(
  await getProxyAndRedisValue<Record<string, PrvToPay>>("prvToPay", {}),
  () => ({ usd: 0, expires: 0, prvToPay: 0, confirmed: false })
);

export const nodesStatistics = await getProxyAndRedisValue<NodesStatistics>(
  "nodesStatistics",
  {} as NodesStatistics
);
