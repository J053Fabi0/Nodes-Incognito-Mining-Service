import Cron from "croner";
import checkNodes from "./utils/checkNodes.ts";
import handleError from "./utils/handleError.ts";
import checkEarnings from "./utils/checkEarnings.ts";
import checkAccounts from "./utils/checkAccounts.ts";

new Cron("*/5 * * * *", { protect: true, catch: handleError }, checkEarnings);

new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkNodes);

// check all active accounts every minute
new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, true));
// check all accounts regardless of the expiry date every hour
new Cron("0 * * * *", { protect: true, catch: handleError }, checkAccounts.bind(null, false));
