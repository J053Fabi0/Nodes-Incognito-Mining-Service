import getRedisValue from "./getRedisValue.ts";
import createTrueRecord from "./createTrueRecord.ts";
import { NodeInfoByDockerIndex } from "./sortNodes.ts";
import isErrorType from "../types/guards/isErrorType.ts";
import { NodesStatistics } from "./getNodesStatistics.ts";
import { NodeRoles, NodeStatus } from "./getNodesStatus.ts";

// ######################################## Errors ####################################################

export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling" | "unsynced";
export const errorTypes = [
  "alert",
  "offline",
  "stalling",
  "unsynced",
  "isSlashed",
  "isOldVersion",
] as ErrorTypes[];

export type GlobalErrorTypes = "lowDiskSpace" | "redisTimeout";
export const globalErrorTypes: GlobalErrorTypes[] = ["lowDiskSpace", "redisTimeout"];

export type AllErrorTypes = ErrorTypes | GlobalErrorTypes;
export const allErrorTypes: readonly AllErrorTypes[] = [...errorTypes, ...globalErrorTypes];

export type ErrorInfo = { startedAt: number; notifiedAt: number };
export type LastErrorTime = Partial<Record<ErrorTypes, ErrorInfo>>;
/** Docker index as key of lastErrorTimes. The number is Date.now() */
export const lastErrorTimes = await getRedisValue<Record<string, LastErrorTime>>("lastErrorTimes", {});

export type LastGlobalErrorTime = Partial<Record<GlobalErrorTypes, ErrorInfo>>;
export const lastGlobalErrorTimes = await getRedisValue<LastGlobalErrorTime>("lastGlobalErrorTimes", {});

// ####################################### Ignore #####################################################

export type AllIgnoreTypes = ErrorTypes | GlobalErrorTypes | "docker" | "autoMove";
export const allIgnoreTypes: AllIgnoreTypes[] = [...errorTypes, ...globalErrorTypes, "docker", "autoMove"];

export type IgnoreData = { minutes: number; from: number };
/** Docker index as key */
export type IgnoreNode = Record<string, IgnoreData>;
export type Ignore = Record<Exclude<AllIgnoreTypes, GlobalErrorTypes>, IgnoreNode> &
  Record<GlobalErrorTypes, IgnoreData>;
/** First key is the error code, second key is the docker index */
export const ignore = createTrueRecord(await getRedisValue<Ignore>("ignore", {} as Ignore), (key) =>
  globalErrorTypes.includes(key as GlobalErrorTypes)
    ? { minutes: 0, from: 0 }
    : createTrueRecord<IgnoreNode>({}, () => ({ minutes: 0, from: 0 }))
);
for (const key of Object.keys(ignore) as AllIgnoreTypes[]) // transform redis data into true records
  if (isErrorType(key)) {
    const entries = Object.entries(ignore[key]);
    delete ignore[key];
    for (const [dockerIndex, values] of entries) {
      const { from, minutes } = values;
      ignore[key][dockerIndex].from = from;
      ignore[key][dockerIndex].minutes = minutes;
    }
  }


// ######################################## Last roles ################################################

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
  await getRedisValue<Record<string, LastRole>>("lastRoles", {}),
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

// ####################################### Prv to pay #################################################

type PrvToPay = {
  usd: number;
  expires: number; // timestamp
  /** The prv it needs to give to host a new node. Decimal format */
  prvToPay: number;
  confirmed: boolean;
};
/** Client Id as key */
export const prvToPay = createTrueRecord(await getRedisValue<Record<string, PrvToPay>>("prvToPay", {}), () => ({
  usd: 0,
  expires: 0,
  prvToPay: 0,
  confirmed: false,
}));

// ######################################## Nodes statistics ##########################################

export const nodesStatistics = await getRedisValue<NodesStatistics>("nodesStatistics", {} as NodesStatistics);

// ######################################## Monthly payments ##########################################

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
  await getRedisValue<Record<string, MonthlyPayments>>("monthlyPayments", {}),
  () => ({ errorInTransaction: false, fee: null, forMonth: new Date().getUTCMonth(), lastWarningDay: null })
);

// ######################################## Monitor info ##############################################

/** For one node */
export interface MonitorInfo {
  date: number;
  nodeStatus: NodeStatus;
  nodeInfo: NodeInfoByDockerIndex[1];
}

export const monitorInfoByDockerIndex: Record<string, MonitorInfo | undefined> = {};

// ###################################### Last accessed page ##########################################

interface LastAccessedPage {
  lastAccesed: number;
}

/** The last time a page has been accessed. The key is the page path */
export const lastAccessedPages = createTrueRecord(
  await getRedisValue<Record<string, LastAccessedPage>>("lastAccessedPages", {}),
  () => ({ lastAccesed: 0 })
);

// ###################################### Node in queue ###############################################

export interface NodeInQueue {
  dockerIndex: number;
  date: number;
}

export type OnlineQueue = Record<NodeRoles, NodeInQueue[]>;
/** These nodes can be online, but won't necessarily be. The complex logic is in getShouldBeOnline */
export const onlineQueue = createTrueRecord(
  await getRedisValue<OnlineQueue>("onlineQueue", {} as OnlineQueue),
  () => []
);

// ###################################### Updating node ###############################################

export interface UpdatingNode {
  deleted: boolean;
  created: boolean;
  dockerIndex: number;
  backupRestored: boolean;
  dockerWasOnline: boolean;
  provenToBeOnline: boolean;
  tempDir: null | { tempDir: string; tempBlockDir: string; blockDir: string; backup: boolean };
}

export const updatingNodes = await getRedisValue<UpdatingNode[]>("updatingNodes", []);

// ####################################################################################################
