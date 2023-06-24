import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import redirect from "../utils/redirect.ts";

export const handler: Handlers<undefined, State> = {
  GET(_, ctx) {
    ctx.state.session.set("userId", null);
    return redirect("/");
  },
};
