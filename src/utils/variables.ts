export type ErrorTypes = "alert" | "isSlashed" | "isOldVersion" | "offline" | "stalling";
export type LastErrorTime = Partial<Record<ErrorTypes, Date>>;
export const lastErrorTimes: Record<string, LastErrorTime> = {};
export const ignoreDocker: { minutes: number; from: Date } = { minutes: 0, from: new Date() };
