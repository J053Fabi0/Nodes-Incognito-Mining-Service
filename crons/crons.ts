import checkNodes from "./checkNodes.ts";
import Cron, { CronOptions } from "croner";
import cacheMonitor from "./cacheMonitor.ts";
import checkEarnings from "./checkEarnings.ts";
import checkKeysMatch from "./checkKeysMatch.ts";
import handleError from "../utils/handleError.ts";
import checkMonthlyFee from "./checkMonthlyFee.ts";
import checkAccounts, { Unit } from "./checkAccounts.ts";
import deleteEmptySessions from "./deleteEmptySessions.ts";
import checkNotStakedNodes from "./checkNotStakedNodes.ts";
import cacheNodesStatistics from "./cacheNodesStatistics.ts";
import { cacheMonitorInfoEvery, maxNotPayedDays } from "../constants.ts";

const options: CronOptions = { catch: handleError, utcOffset: 0 };

new Cron("*/5 * * * *", options, checkEarnings);

new Cron("*/30 * * * * *", { protect: true, ...options }, checkNodes);

// every minute, check the accounts that have used the website in the last 5 minutes
new Cron("*/1 * * * *", { protect: true, ...options }, checkAccounts.bind(null, 5, Unit.minute));
// every hour, check the accounts that have used the website in the last day
new Cron("0 * * * *", { protect: true, ...options }, checkAccounts.bind(null, 1, Unit.day));

// delete empty sessions every hour
new Cron("0 * * * *", { protect: true, ...options }, deleteEmptySessions);

// check not staked nodes every 30 minutes
new Cron("*/30 * * * *", { protect: true, ...options }, checkNotStakedNodes);

// cache nodes statistics every 5 minutes
new Cron("*/5 * * * *", options, cacheNodesStatistics);

// check the monthly fee every 1st day of the month until the maxNotPayedDays
new Cron(`*/30 * 1-${maxNotPayedDays} * *`, options, checkMonthlyFee.bind(null, false));
// remove the nodes that haven't paid after maxNotPayedDays
new Cron(`*/20 1 ${maxNotPayedDays + 1} * *`, options, checkMonthlyFee.bind(null, true));

// cache the monitor responses every 10 seconds
new Cron(`*/${cacheMonitorInfoEvery} * * * * *`, { protect: true, ...options }, cacheMonitor);

// every day at 00:00
new Cron("0 0 * * *", options, checkKeysMatch);
