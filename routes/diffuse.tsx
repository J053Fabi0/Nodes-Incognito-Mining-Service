import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import handleError from "../utils/handleError.ts";

export const handler: Handlers<null, State> = {
  GET() {
    console.time("Diffuser.");
    console.log("Diffusing...");
    import("../utils/diffuse.ts").catch(handleError).finally(() => console.timeEnd("Diffuser."));
    return new Response();
  },
};
