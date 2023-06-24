import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import { checkSignature } from "grammy_validator";
import { NOTIFICATIONS_BOT_TOKEN } from "../env.ts";
import getQueryParams from "../utils/getQueryParams.ts";

export const handler: Handlers<undefined, State> = {
  GET(req, ctx) {
    const params = getQueryParams(req.url);
    if (params.hash) {
      const good = checkSignature(NOTIFICATIONS_BOT_TOKEN, params);
      if (!good) throw new Error("Bad signature");
    }

    return ctx.render();
  },
};

export default function SignIn() {
  return (
    <div class="w-full flex justify-center mt-20">
      <script
        async
        data-size="large"
        data-auth-url="signin"
        data-request-access="write"
        data-telegram-login="pruebaDeScratchBot"
        src="https://telegram.org/js/telegram-widget.js?22"
      />
    </div>
  );
}
