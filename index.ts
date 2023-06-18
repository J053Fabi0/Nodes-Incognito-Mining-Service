import "./env.ts";
import { sleep } from "sleep";
import "./src/telegram/initBot.ts";
import check from "./src/check.ts";
import handleError from "./src/utils/handleError.ts";

// Start to check
while (true)
  try {
    await check();
  } catch (e) {
    handleError(e);
    console.error(e);
  } finally {
    await sleep(60);
  }
