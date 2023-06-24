import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import redirect from "../utils/redirect.ts";
import { checkSignature } from "grammy_validator";
import getQueryParams from "../utils/getQueryParams.ts";
import { isTelegramPayload } from "../types/telegramPayload.type.ts";
import { createClient, getClient } from "../controllers/client.controller.ts";
import { NOTIFICATIONS_BOT_TOKEN, NOTIFICATIONS_BOT_USERNAME } from "../env.ts";

export const handler: Handlers<undefined, State> = {
  async GET(req, ctx) {
    if (ctx.state.user) return redirect("/");

    const params = getQueryParams(req.url);
    if (isTelegramPayload(params)) {
      const good = checkSignature(NOTIFICATIONS_BOT_TOKEN, params);
      if (!good) throw new Error("Bad signature");

      const user = await getClient({ telegram: params.id });

      if (user) {
        ctx.state.session.set("userId", user._id.toString());
      } else {
        const newUser = await createClient({
          role: "client",
          notionPage: null,
          telegram: params.id,
          name: params.username || `${params.first_name ?? ""} ${params.last_name ?? ""}`,
        });
        ctx.state.session.set("userId", newUser._id.toString());
      }

      return redirect("/");
    }

    return ctx.render();
  },
};

export default function SignIn() {
  return (
    <div class="w-full flex flex-col flex-wrap items-center mt-10">
      <div
        class={
          "border-solid border-cyan-300 border-2 rounded-full p-1 " +
          "bg-gradient-to-r from-cyan-500 to-blue-500 " +
          "min-h-[50.8px] min-w-[250px]"
        }
      >
        <script
          async
          data-size="large"
          data-auth-url="signin"
          data-request-access="write"
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-login={NOTIFICATIONS_BOT_USERNAME.toLowerCase()}
        />
      </div>
    </div>
  );
}
