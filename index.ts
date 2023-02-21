import { sleep } from "sleep";
import "./src/telegram/initBot.ts";
import check from "./src/check.ts";
import handleError from "./src/utils/handleError.ts";
import { dockerPs } from "./src/utils/commands.ts";

const checkEachXSeconds = +Deno.args[0] || 60;

console.log(await dockerPs());

// Start to check
// while (true)
//   try {
//     await check();
//   } catch (e) {
//     handleError(e);
//     console.error(e);
//   } finally {
//     await sleep(checkEachXSeconds);
//   }
