import createTrueRecord from "./createTrueRecord.ts";
import { NodeInfoByDockerIndex } from "./sortNodes.ts";
import { NodesStatistics } from "./getNodesStatistics.ts";
import { NodeRoles, NodeStatus } from "./getNodesStatus.ts";
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

type LastRole = {
  /** The date in which the role changed */
  date: number;
  client: string;
  role: NodeRoles | "-";
  /** The creation date of the node */
  createdAt: number;
  nodeNumber: number;
  /** the last day since that a warning has been send */
  lastWarningDay?: number;
  /** Remove on date */
  removeOnDate?: number;
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
    role: "-" as const,
  }),
  (target, dockerIndex, obj) => {
    // only allow to set LastRole
    if (!isLastRole(obj)) return false;
    // let symbol pass
    if (typeof dockerIndex !== "string") return Reflect.set(target, dockerIndex, obj);
    // only let strings that represent a valid number
    if (isNaN(+dockerIndex)) return false;

    // update if the new role is different from the old one or the old one is is a dummy one
    if (obj.role !== lastRoles[dockerIndex].role) return Reflect.set(target, dockerIndex, obj);
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

export type MonthlyPayments = {
  /** If an error happened with us */
  errorInTransaction: boolean;
  /** The day in which a warning was last sent in the month */
  lastWarningDay: number | null;
  /** The fee for the month, without the incognito fee. Int format. If it's null, update it. */
  fee: number | null;
  /** Month of the year. 0-11 */
  forMonth: number;
};
/** Client id as key */
export const monthlyPayments = createTrueRecord(
  await getProxyAndRedisValue<Record<string, MonthlyPayments>>("monthlyPayments", {}),
  () => ({ errorInTransaction: false, fee: null, forMonth: new Date().getUTCMonth(), lastWarningDay: null })
);

/** For one node */
export interface MonitorInfo {
  date: number;
  nodeStatus: NodeStatus;
  nodeInfo: NodeInfoByDockerIndex[1];
}

export const monitorInfoByDockerIndex: Record<string, MonitorInfo | undefined> = {};

interface LastAccessedPage {
  lastAccesed: number;
}

/** The last time a page has been accessed. The key is the page path */
export const lastAccessedPages = createTrueRecord(
  await getProxyAndRedisValue<Record<string, LastAccessedPage>>("lastAccessedPages", {}),
  () => ({ lastAccesed: 0 })
);

export interface NodeInQueue {
  dockerIndex: number;
  date: number;
}

export type OnlineQueue = Record<NodeRoles, NodeInQueue[]>;
/** These nodes can be online, but won't necessarily be. The complex logic is in getShouldBeOnline */
export const onlineQueue = createTrueRecord(
  await getProxyAndRedisValue<OnlineQueue>("onlineQueue", {} as OnlineQueue),
  () => []
);
