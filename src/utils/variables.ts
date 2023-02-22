export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling";
export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
export const lastErrorTimes: Record<string, LastErrorTime> = {};
