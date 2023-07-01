import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import { getAccount } from "../controllers/account.controller.ts";

export const handler: Handlers<null, State> = {
  async GET(_, ctx) {
    const account = (await getAccount({ _id: ctx.state.user!.account }, { projection: { balance: 1, _id: 0 } }))!;

    return new Response(JSON.stringify({ balance: account.balance }), {
      headers: { "content-type": "application/json" },
    });
  },
};
