import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import Button from "../../components/Button.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsFillCartCheckFill } from "react-icons/bs";
import isResponse from "../../types/guards/isResponse.ts";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { minutesOfPriceStability } from "../../constants.ts";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";

const styles = {
  th: "py-2 px-3 text-right",
  td: "py-2 px-3 text-left",
  label: `whitespace-nowrap flex items-center gap-2 ${getTypographyClass("p")}`,
  ol: `list-decimal list-inside mt-2 ${getTypographyClass("lead")} flex gap-2 flex-col`,
};

dayjs.extend(utc);

interface NewNodeConfirmProps {
  /** Int format */
  balance: number;
  prvPrice: number;
  prvToPay: number;
  confirmationExpires: number;
}

async function getDataOrRedirect(
  ctx: HandlerContext<NewNodeConfirmProps, State>
): Promise<Response | NewNodeConfirmProps> {
  const savedPrvPrice: State["prvPrice"] = { ...(ctx.state.prvPrice || { usd: 0, expires: 0, prvToPay: 0 }) };

  if (savedPrvPrice.prvToPay === 0) return redirect("/nodes/new");

  // the confirmation expires in the previous time plus an exatra minutesOfPriceStability
  const confirmationExpires = dayjs(savedPrvPrice.expires).utc().add(minutesOfPriceStability, "minute").valueOf();

  // if the confirmation expires, redirect to the new node page
  if (confirmationExpires <= Date.now()) return redirect("/nodes/new");

  const account = (await getAccount({ _id: ctx.state.user!.account }, { projection: { balance: 1, _id: 0 } }))!;

  // if it is not enough balance to pay for the node, redirect to the new node page
  if (account.balance < savedPrvPrice.prvToPay * 1e9) return redirect("/nodes/new");

  return {
    confirmationExpires,
    balance: account.balance,
    prvPrice: savedPrvPrice.usd,
    prvToPay: savedPrvPrice.prvToPay,
  };
}

export const handler: Handlers<NewNodeConfirmProps, State> = {
  async GET(_, ctx) {
    const dataOrRedirect = await getDataOrRedirect(ctx);

    if (isResponse(dataOrRedirect)) return dataOrRedirect;

    return ctx.render(dataOrRedirect);
  },

  async POST(req, ctx) {
    const form = await req.formData();
    const action = form.get("action")?.toString();

    if (action === "cancel") return redirect("/");

    const dataOrRedirect = await getDataOrRedirect(ctx);

    if (isResponse(dataOrRedirect)) return dataOrRedirect;

    return redirect("/nodes/new-confirm");
  },
};

export default function newConfirm({ data }: PageProps<NewNodeConfirmProps>) {
  const { confirmationExpires, balance, prvPrice, prvToPay } = data;

  return (
    <>
      <Typography variant="h1" class="mb-5">
        Confirm new node
      </Typography>

      <Typography variant="lead">
        Confirm before{" "}
        <b>
          <TimeLeft date={confirmationExpires} />
        </b>{" "}
        or the price will reload. Your balance will not be affected, but you may need to pay more (or less).
      </Typography>

      <table class="table-auto my-5">
        <tbody>
          <tr>
            <th class={styles.th}>Balance</th>
            <td class={styles.td}>
              <code>
                <Balance
                  goal={prvToPay}
                  whenLowerThanGoal
                  redirectsTo="/nodes/new"
                  websiteUrl={WEBSITE_URL}
                  initialBalance={balance}
                />
              </code>{" "}
              PRV
            </td>
          </tr>
          <tr>
            <th class={styles.th}>To pay</th>
            <td class={styles.td}>
              <code>{prvToPay}</code> PRV
            </td>
          </tr>
          <tr>
            <th class={styles.th}>Balance afterwards</th>
            <td class={styles.td}>
              <code>
                <Balance initialBalance={balance} substract={prvToPay * 1e9} />
              </code>{" "}
              PRV
            </td>
          </tr>
        </tbody>
      </table>

      {/* After you pay */}
      <AfterYouPay class="mt-5" />

      <Typography variant="h3" class="mt-5">
        Node account data
      </Typography>

      <ol class={styles.ol + " mt-3"}>
        <li>
          Create an account in the Incognito app: <b>More</b> &gt; <b>Keychain</b>.
        </li>
        <li>
          Find its keys: <b>More</b> &gt; <b>Keychain</b> &gt; <b>Select the account</b>.
        </li>
      </ol>

      <form method="POST" class="mt-3">
        <div class="flex flex-col gap-3">
          <div>
            <label for="validator" class={styles.label}>
              Validator key
              <AiOutlineInfoCircle class="hidden sm:block" title="Used to initialize the node" size={18} />
              <span class="block sm:hidden">(used to initialize the node)</span>
            </label>

            <input
              required
              type="text"
              id="validator"
              name="validator"
              pattern={IncognitoCli.validatorKeyRegex.source}
              class="p-2 border border-gray-300 rounded w-full"
            />
          </div>

          <div>
            <label for="validatorPublic" class={styles.label}>
              Validator public key
              <AiOutlineInfoCircle class="hidden sm:block" title="Used to check the node status" size={18} />
              <span class="block sm:hidden">(used to check the node status)</span>
            </label>

            <input
              required
              type="text"
              id="validatorPublic"
              name="validatorPublic"
              class="p-2 border border-gray-300 rounded w-full"
              pattern={IncognitoCli.validatorPublicKeyRegex.source}
            />
          </div>
        </div>

        <div class="flex items-end gap-3 mt-3">
          <Button type="submit" color="green" name="action" value="confirm" class="mt-3 !normal-case">
            <Typography variant="h4" class="flex items-center gap-2">
              Confirm
              <BsFillCartCheckFill size={20} />
            </Typography>
          </Button>

          <Button type="submit" color="red" name="action" value="cancel" class="mt-3 !normal-case h-min py-1 px-3">
            <Typography variant="lead">Cancel</Typography>
          </Button>
        </div>
      </form>
    </>
  );
}
