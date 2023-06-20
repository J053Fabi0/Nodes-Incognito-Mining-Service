import Cron from "croner";
import checkNodes from "./utils/checkNodes.ts";
import handleError from "./utils/handleError.ts";
import checkEarnings from "./utils/checkEarnings.ts";

new Cron("*/5 * * * *", runningWrapper(checkEarnings));

new Cron("*/1 * * * *", runningWrapper(checkNodes));

function runningWrapper(fn: () => Promise<void>) {
  let running = false;
  return () => {
    if (running) return;
    running = true;
    fn()
      .catch(handleError)
      .finally(() => (running = false));
  };
}
