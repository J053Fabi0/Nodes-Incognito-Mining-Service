import moment from "moment";
import { lastAccessedPages } from "./variables.ts";
import { maxMinutesMonitorInfo } from "../constants.ts";

export default function shouldContinueRefreshingMonitorInfo(): boolean {
  const { lastAccesed } = lastAccessedPages["/nodes/monitor"];
  return moment().diff(lastAccesed, "minutes") < maxMinutesMonitorInfo;
}
