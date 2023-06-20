import Cron from "croner";
import checkNodes from "./checkNodes.ts";
import checkEarnings from "./checkEarnings.ts";
import handleError from "./utils/handleError.ts";

new Cron("*/5 * * * * *", runningWrapper(checkEarnings));

new Cron("*/1 * * * * *", runningWrapper(checkNodes));

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
