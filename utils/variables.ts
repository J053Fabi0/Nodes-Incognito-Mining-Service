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
export const globalErrorTypes = ["lowDiskSpace"] as GlobalErrorTypes[];

export type AllErrorTypes = ErrorTypes | GlobalErrorTypes;
export const allErrorTypes = [...errorTypes, ...globalErrorTypes] as AllErrorTypes[];

export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
// Node's public validator key as key of lastErrorTimes
export const lastErrorTimes: Record<string, LastErrorTime> = {};

export type LastGlobalErrorTime = Partial<Record<GlobalErrorTypes, Date>>;
export const lastGlobalErrorTimes: LastGlobalErrorTime = {};

export const ignore: Record<AllErrorTypes | "docker" | "autoMove", { minutes: number; from: Date }> = {
  alert: { minutes: 0, from: new Date() },
  isSlashed: { minutes: 0, from: new Date() },
  isOldVersion: { minutes: 0, from: new Date() },
  offline: { minutes: 0, from: new Date() },
  stalling: { minutes: 0, from: new Date() },
  docker: { minutes: 0, from: new Date() },
  autoMove: { minutes: 0, from: new Date() },
  unsynced: { minutes: 0, from: new Date() },
  lowDiskSpace: { minutes: 0, from: new Date() },
};

// Node's public validator key as key
export const syncedNodes: Record<string | number, boolean> = {};
