import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import handleError from "../utils/handleError.ts";
import diffuse from "../utils/diffuse.ts";

export const handler: Handlers<null, State> = {
  async GET() {
    console.time("Diffuser.");
    console.log("Diffusing...");
    await diffuse()
      .catch(handleError)
      .finally(() => console.timeEnd("Diffuser."));
    return new Response("Done");
  },
};
