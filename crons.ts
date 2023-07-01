import Cron from "croner";
import checkNodes from "./utils/checkNodes.ts";
import handleError from "./utils/handleError.ts";
import checkEarnings from "./utils/checkEarnings.ts";
import checkAccounts from "./utils/checkAccounts.ts";

new Cron("*/5 * * * *", { protect: true, catch: handleError }, checkEarnings);

new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkNodes);

new Cron("*/1 * * * *", { protect: true, catch: handleError }, checkAccounts);
