import { Handlers } from "$fresh/server.ts";
import State from "../../../types/state.type.ts";
import { syncedNodes } from "../../../utils/variables.ts";

export const handler: Handlers<null, State> = {
  GET() {
    return new Response(JSON.stringify(syncedNodes), { headers: { "content-type": "application/json" } });
  },
};
