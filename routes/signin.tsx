import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import State from "../types/state.type.ts";
import redirect from "../utils/redirect.ts";
import cryptr from "../utils/cryptrInstance.ts";
import { checkSignature } from "grammy_validator";
import handleError from "../utils/handleError.ts";
import Typography from "../components/Typography.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import getQueryParams from "../utils/getQueryParams.ts";
import IncognitoCli from "../incognito/IncognitoCli.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import { isTelegramPayload } from "../types/telegramPayload.type.ts";
import { createAccount } from "../controllers/account.controller.ts";
import { createClient, getClient } from "../controllers/client.controller.ts";
import { NOTIFICATIONS_BOT_TOKEN, NOTIFICATIONS_BOT_USERNAME, WEBSITE_URL } from "../env.ts";

dayjs.extend(utc);

interface SigninProps {
  create: boolean;
}

export const handler: Handlers<SigninProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);
    const create = "create" in params;
    const redirectTo = create ? "/nodes/new" : "/";

    if (ctx.state.user) return redirect(redirectTo);

    const telegamPayload = isTelegramPayload(params);
    if (telegamPayload) {
      const good = checkSignature(NOTIFICATIONS_BOT_TOKEN, params);
      if (!good) throw new Error("Bad signature");

      const user = await getClient({ telegram: params.id });

      if (user) {
        ctx.state.session.set("userId", user._id.toString());
      } else {
        const {
          mnemonic,
          accounts: [newAccount],
        } = await IncognitoCli.generateAccount({ submitKey: true });
        const submittedAccount = await createAccount({
          balance: 0,
          shardID: newAccount.shardID,
          miningKey: newAccount.miningKey,
          publicKey: newAccount.publicKey,
          mnemonic: await cryptr.encrypt(mnemonic),
          paymentAddress: newAccount.paymentAddress,
          miningPublicKey: newAccount.miningPublicKey,
          paymentAddressV1: newAccount.paymentAddressV1,
          validatorPublicKey: newAccount.validatorPublicKey,
          privateKey: await cryptr.encrypt(newAccount.privateKey),
          readOnlyKey: await cryptr.encrypt(newAccount.readOnlyKey),
          otaPrivateKey: await cryptr.encrypt(newAccount.otaPrivateKey),
        });

        const newUser = await createClient({
          role: "client",
          telegram: params.id,
          account: submittedAccount._id,
          lastPayment: dayjs().utc().startOf("month").toDate(),
          name: params.username || [params.first_name, params.last_name].join(" ").trim(),
        });
        ctx.state.session.set("userId", newUser._id.toString());

        await sendHTMLMessage(
          `<b>Welcome to the hosting service for Incognito nodes!</b>\n\n` +
            `Please don't block this bot, it's necessary to send you notifications about your nodes.\n` +
            `You can manage your notifications <a href="${WEBSITE_URL}/nodes/notifications">here</a>.`,
          params.id,
          {},
          "notificationsBot"
        ).catch(handleError);

        await sendHTMLMessage(
          `A new user has signed up!\n\n` +
            `Name: <code>${newUser.name}</code>\n` +
            `Telegram ID: <code>${newUser.telegram}</code>\n` +
            `Account ID: <code>${submittedAccount._id}</code>`
        ).catch(handleError);
      }

      return redirect(redirectTo);
    }

    return ctx.render({ create: "create" in params });
  },
};

export default function SignIn({ data }: PageProps<SigninProps>) {
  const { create } = data;

  return (
    <>
      <Typography variant="h1" class="mb-5">
        {create ? "Create an account with Telegram" : "Sign in or create an account"}
      </Typography>

      <Typography variant="h4" class="mb-5">
        {create ? "Start hosting your nodes with us today" : "Both with the same button"}.
      </Typography>

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
            data-request-access="write"
            src="https://telegram.org/js/telegram-widget.js?22"
            data-auth-url={"signin" + (create ? `/?create` : "")}
            data-telegram-login={NOTIFICATIONS_BOT_USERNAME.toLowerCase()}
          />
        </div>

        <Typography variant="smallP" class="mt-3">
          <i>The login widget might take a few seconds to load at first.</i>
        </Typography>
      </div>
    </>
  );
}
