import moment, { Moment } from "moment";
import { maxNotPayedDays } from "../constants.ts";

export default function getIsTimeToPay(now: Date | Moment = new Date()): boolean {
  return moment(now).utc().date() >= 1 && moment(now).utc().date() <= maxNotPayedDays;
}
