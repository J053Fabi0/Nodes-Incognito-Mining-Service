export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline";
export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
export const lastErrorTimes: Record<string, LastErrorTime> = {};
