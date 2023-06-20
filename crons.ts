import Cron from "croner";
import check from "./check.ts";
import checkEarnings from "./checkEarnings.ts";
import handleError from "./utils/handleError.ts";

new Cron("*/5 * * * * *", () => {
  checkEarnings().catch(handleError);
});

new Cron("*/1 * * * * *", () => {
  check().catch(handleError);
});
