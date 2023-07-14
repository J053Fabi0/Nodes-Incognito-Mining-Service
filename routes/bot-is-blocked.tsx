import State from "../types/state.type.ts";
import { Handlers } from "$fresh/server.ts";
import redirect from "../utils/redirect.ts";
import Button from "../components/Button.tsx";
import { FaTelegramPlane } from "react-icons/fa";
import Typography from "../components/Typography.tsx";
import { changeClient } from "../controllers/client.controller.ts";
import { NOTIFICATIONS_BOT_USERNAME, WEBSITE_URL } from "../env.ts";
import sendMessage, { BotBlocked, sendHTMLMessage } from "../telegram/sendMessage.ts";

export const handler: Handlers<undefined, State> = {
  async GET(_, ctx) {
    if (!ctx.state.user?.isBotBlocked) return redirect(WEBSITE_URL);

    const result = await sendMessage("Am I unblocked already?");
    const isStillBlocked = result === BotBlocked.HANDLED || result === BotBlocked.NOT_HANDLED;

    if (!isStillBlocked) {
      sendHTMLMessage(
        "Great, I'm not.\n\nThank you for understanding.\n\nRemember that you can manage your notifications " +
          `<a href="${WEBSITE_URL}/nodes/notifications">here</a>.`,
        ctx.state.user.telegram!,
        { disable_web_page_preview: true },
        "notificationsBot"
      );
      await changeClient({ _id: ctx.state.user._id }, { $set: { isBotBlocked: false } });
      return redirect(WEBSITE_URL);
    }

    return ctx.render();
  },
};

export default function BotIsBlocked() {
  return (
    <>
      <Typography variant="h1" class="mt-5 mb-5">
        Oops, did you blocked the bot? 🤖
      </Typography>

      <Typography variant="h3" class="mt-1 mb-5">
        Please unblock it or start a conversation with it to continue using the service.
      </Typography>

      <Typography variant="lead" class="mt-1 mb-5">
        You can manage your notifications in <b>My nodes</b> {">"} <b>Notifications</b>.
      </Typography>

      <a href={`https://t.me/${NOTIFICATIONS_BOT_USERNAME}`} target="blank">
        <Button color="blue">
          <Typography variant="h3" class="normal-case flex items-center gap-3">
            @{NOTIFICATIONS_BOT_USERNAME}
            <FaTelegramPlane />
          </Typography>
        </Button>
      </a>
    </>
  );
}
