import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import handleError from "../utils/handleError.ts";

export const handler: Handlers<null, State> = {
  GET() {
    import("../utils/diffuse.ts").catch(handleError);
    return new Response();
  },
};
