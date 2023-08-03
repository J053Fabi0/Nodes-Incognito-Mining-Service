import moment from "moment";
import { maxMinutesMonitorInfo } from "../constants.ts";
import { MonitorInfo, lastAccessedPages } from "./variables.ts";

export default function isMonitorInfoTooOld(monitorInfo: MonitorInfo): boolean {
  return moment().diff(monitorInfo.date, "minutes") >= maxMinutesMonitorInfo;
}

export function shouldContinueRefreshingMonitorInfo(): boolean {
  const { lastAccesed } = lastAccessedPages["/nodes/monitor"];
  return moment().diff(lastAccesed, "minutes") < maxMinutesMonitorInfo;
}
