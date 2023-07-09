import { Handlers } from "$fresh/server.ts";
import State from "../../../types/state.type.ts";
import { lastErrorTimes } from "../../../utils/variables.ts";

export const handler: Handlers<null, State> = {
  GET() {
    return new Response(JSON.stringify(lastErrorTimes), { headers: { "content-type": "application/json" } });
  },
};
