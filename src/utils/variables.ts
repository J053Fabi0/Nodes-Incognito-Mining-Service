export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling";
// Node's public validator key as key
export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
export const lastErrorTimes: Record<string, LastErrorTime> = {};
export const ignoreDocker: { minutes: number; from: Date } = { minutes: 0, from: new Date() };

// Node's public validator key as key
export const syncedNodes: Record<string | number, boolean> = {};
