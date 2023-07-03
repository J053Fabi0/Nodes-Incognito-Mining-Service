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
export const syncedNodes = await getProxyAndRedisValue<Record<string | number, boolean>>("syncedNodes", {});
