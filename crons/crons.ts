import Cron from "croner";
import checkNodes from "./checkNodes.ts";
import checkEarnings from "./checkEarnings.ts";
import handleError from "../utils/handleError.ts";
import checkAccounts, { Unit } from "./checkAccounts.ts";
import deleteEmptySessions from "./deleteEmptySessions.ts";
import checkNotStakedNodes from "./checkNotStakedNodes.ts";

new Cron("*/5 * * * *", { protect: true, catch: handleError }, checkEarnings);

new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkNodes);

// every minute, check the accounts that have used the website in the last 5 minutes
new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, 5, Unit.minute));
// every hour, check the accounts that have used the website in the last day
new Cron("0 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, 1, Unit.day));

// delete empty sessions every hour
new Cron("0 * * * *", { protect: true, catch: handleError }, deleteEmptySessions);

// check not staked nodes every 30 minutes
new Cron("*/30 * * * *", { protect: true, catch: handleError }, checkNotStakedNodes);
