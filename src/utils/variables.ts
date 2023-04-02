export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling" | "unsynced";
export const errorTypes = [
  "alert",
  "isSlashed",
  "isOldVersion",
  "offline",
  "stalling",
  "unsynced",
] as ErrorTypes[];
export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
// Node's public validator key as key of lastErrorTimes
export const lastErrorTimes: Record<string, LastErrorTime> = {};
export const ignore: Record<ErrorTypes | "docker", { minutes: number; from: Date }> = {
  alert: { minutes: 0, from: new Date() },
  isSlashed: { minutes: 0, from: new Date() },
  isOldVersion: { minutes: 0, from: new Date() },
  offline: { minutes: 0, from: new Date() },
  stalling: { minutes: 0, from: new Date() },
  docker: { minutes: 0, from: new Date() },
  unsynced: { minutes: 0, from: new Date() },
};

// Node's public validator key as key
export const syncedNodes: Record<string | number, boolean> = {};
