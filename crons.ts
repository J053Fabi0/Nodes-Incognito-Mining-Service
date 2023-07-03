import Cron from "croner";
import checkNodes from "./utils/checkNodes.ts";
import handleError from "./utils/handleError.ts";
import checkEarnings from "./utils/checkEarnings.ts";
import checkAccounts, { Unit } from "./utils/checkAccounts.ts";
import deleteEmptySessions from "./utils/deleteEmptySessions.ts";

new Cron("*/5 * * * *", { protect: false, catch: handleError }, checkEarnings);

new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkNodes);

// every minute, check the accounts that have used the website in the last 5 minutes
new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, 5, Unit.minute));
// every hour, check the accounts that have used the website in the last day
new Cron("0 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, 1, Unit.day));

// delete empty sessions every hour
new Cron("0 * * * *", { protect: true, catch: handleError }, deleteEmptySessions);
