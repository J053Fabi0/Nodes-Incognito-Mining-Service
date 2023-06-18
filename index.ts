import "./env.ts";
import { sleep } from "sleep";
import check from "./src/check.ts";
import "./src/telegram/initBots.ts";
import handleError from "./src/utils/handleError.ts";
import checkEarnings from "./src/checkEarnings.ts";

// Start to check the earnings
checkEarnings();

// Start to check the dockers and nodes' status
while (true)
  try {
    await check();
  } catch (e) {
    handleError(e);
  } finally {
    await sleep(60);
  }
