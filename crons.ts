import Cron from "croner";
import check from "./check.ts";
import checkEarnings from "./checkEarnings.ts";

new Cron("*/5 * * * * *", () => {
  checkEarnings();
});

new Cron("*/1 * * * * *", () => {
  check();
});
