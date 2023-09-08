import diffuse from "../utils/diffuse.ts";
import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import handleError from "../utils/handleError.ts";

let count = 0;

export const handler: Handlers<null, State> = {
  async GET() {
    const timerName = `Diffuser ${++count}`;
    console.time(timerName);
    console.log("Diffusing...");
    await diffuse()
      .catch(handleError)
      .finally(() => console.timeEnd(timerName));
    return new Response("Done");
  },
};
