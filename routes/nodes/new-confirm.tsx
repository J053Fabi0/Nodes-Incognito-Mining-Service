import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsFillCartCheckFill } from "react-icons/bs";
import submitNode from "../../incognito/submitNode.ts";
import isResponse from "../../types/guards/isResponse.ts";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import Button, { getButtonClasses } from "../../components/Button.tsx";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";
import { incognitoFee, incognitoFeeInt, minutesOfPriceStability } from "../../constants.ts";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import { toFixedS } from "../../utils/numbersString.ts";

const styles = {
  th: "py-2 px-3 text-right",
  td: "py-2 px-3 text-left",
  label: `whitespace-nowrap flex items-center gap-2 ${getTypographyClass("p")}`,
  ol: `list-decimal list-inside mt-2 ${getTypographyClass("lead")} flex gap-2 flex-col`,
};

dayjs.extend(utc);

const THIS_URL = `${WEBSITE_URL}/nodes/new-confirm`;
const MONITOR_URL = `${WEBSITE_URL}/nodes/monitor`;

interface NewNodeConfirmProps {
  /** Int format */
  balance: number;
  prvPrice: number;
  prvToPay: number;
  confirmationExpires: number;
  errors: ZodIssue[] | undefined;
}

async function getDataOrRedirect(
  ctx: HandlerContext<NewNodeConfirmProps, State>
): Promise<Response | NewNodeConfirmProps> {
  const savedPrvPrice = ctx.state.prvPrice;

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
    errors: ctx.state.session.flash("errors"),
  };
}

export const handler: Handlers<NewNodeConfirmProps, State> = {
  async GET(_, ctx) {
    const dataOrRedirect = await getDataOrRedirect(ctx);

    if (isResponse(dataOrRedirect)) return dataOrRedirect;

    return ctx.render(dataOrRedirect);
  },

  async POST(req, ctx) {
    const dataOrRedirect = await getDataOrRedirect(ctx);

    if (isResponse(dataOrRedirect)) return dataOrRedirect;

    const form = await req.formData();

    const { validatedData, errors } = await validateFormData(form, {
      validator: z.string().trim().regex(IncognitoCli.validatorKeyRegex, "Invalid validator key."),
      validatorPublic: z
        .string()
        .trim()
        .regex(IncognitoCli.validatorPublicKeyRegex, "Invalid validator public key."),
    });

    if (errors) {
      ctx.state.session.flash("errors", errors);
      return redirect(THIS_URL);
    }

    submitNode({
      clientId: ctx.state.user!._id,
      validator: validatedData.validator,
      validatorPublic: validatedData.validatorPublic,
      cost: dataOrRedirect.prvToPay * 1e9 - incognitoFeeInt,
    });

    return redirect(MONITOR_URL);
  },
};

export default function newConfirm({ data }: PageProps<NewNodeConfirmProps>) {
  const { confirmationExpires, balance, prvToPay, errors } = data;

  const validatorError = error(errors, "validator");
  const validatorPublicError = error(errors, "validatorPublic");

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
              <code>{toFixedS(prvToPay - incognitoFee, 2)}</code> PRV
            </td>
          </tr>
          <tr>
            <th class={styles.th}>Incognito fee</th>
            <td class={styles.td}>
              <code>{incognitoFee}</code> PRV
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
      <AfterYouPay class="mt-5" confirming />

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

            {validatorError && (
              <Typography variant="p" class="mt-1 text-red-600">
                {validatorError.message}
              </Typography>
            )}
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

          {validatorPublicError && (
            <Typography variant="p" class="mt-1 text-red-600">
              {validatorPublicError.message}
            </Typography>
          )}
        </div>

        <div class="flex items-end justify-center gap-5 mt-3">
          <Button type="submit" color="green" class="mt-3 !normal-case">
            <Typography variant="h4" class="flex items-center gap-2">
              Confirm
              <BsFillCartCheckFill size={20} />
            </Typography>
          </Button>

          <a class={`${getButtonClasses("red", false)} mt-3 py-1 px-2`} href="/me/balance">
            <Typography variant="p" class="!normal-case h-min py-0">
              Cancel, get refund
            </Typography>
          </a>
        </div>
      </form>
    </>
  );
}
