import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import { IS_PRODUCTION, WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import submitNode from "../../incognito/submitNode.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Node from "../../types/collections/node.type.ts";
import isResponse from "../../types/guards/isResponse.ts";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { getNode, getNodes } from "../../controllers/node.controller.ts";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";
import NewConfirmNodeSelector from "../../islands/NewConfirmNodeSelector.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import { incognitoFee, incognitoFeeInt, minutesOfPriceStability } from "../../constants.ts";
import newZodError from "../../utils/newZodError.ts";

export const styles = {
  th: "py-2 px-3 text-right",
  td: "py-2 px-3 text-left",
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
  isAdmin: boolean;
  confirmationExpires: number;
  errors: ZodIssue[] | undefined;
  inactiveNodes: Pick<Node, "number" | "validatorPublic" | "validator">[];
  defaultValidator: string;
  defaultValidatorPublic: string;
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

  const inactiveNodes = await getNodes(
    { inactive: true, client: ctx.state.user!._id },
    { projection: { validator: 1, validatorPublic: 1, number: 1 } }
  );

  // if it is not enough balance to pay for the node, redirect to the new node page
  if (account.balance < savedPrvPrice.prvToPay * 1e9) return redirect("/nodes/new");

  return {
    inactiveNodes,
    confirmationExpires,
    balance: account.balance,
    isAdmin: ctx.state.isAdmin,
    prvPrice: savedPrvPrice.usd,
    prvToPay: savedPrvPrice.prvToPay,
    errors: ctx.state.session.flash("errors"),
    defaultValidator: ctx.state.session.flash("defaultValidator"),
    defaultValidatorPublic: ctx.state.session.flash("defaultValidatorPublic"),
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
    ctx.state.session.flash("defaultValidator", form.get("validator") ?? "");
    ctx.state.session.flash("defaultValidatorPublic", form.get("validatorPublic") ?? "");
    const { errors, ...data } = await validateFormData(form, {
      validator: z.string().trim().regex(IncognitoCli.validatorKeyRegex, "Invalid validator key."),
      validatorPublic: z
        .string()
        .trim()
        .regex(IncognitoCli.validatorPublicKeyRegex, "Invalid validator public key."),
    });
    const validatedData = data.validatedData as { validator: string; validatorPublic: string };

    if (errors) {
      ctx.state.session.flash("errors", errors);
      return redirect(THIS_URL);
    }

    const existingNode = await getNode(
      { $or: [{ validator: validatedData.validator }, { validatorPublic: validatedData.validatorPublic }] },
      { projection: { client: 1, validator: 1, validatorPublic: 1, inactive: 1 } }
    );

    if (existingNode) {
      // if he's not the owner of the node
      if (`${existingNode.client}` !== ctx.state.userId) {
        ctx.state.session.flash("errors", [
          await newZodError("validator", "This node was already registered with us, but it wasn't you who did."),
        ]);
        return redirect(THIS_URL);
      }
      // if it's not inactive
      else if (existingNode.inactive === false) {
        ctx.state.session.flash("errors", [
          await newZodError("validator", "This node is currently active. Please create a new account."),
        ]);
        return redirect(THIS_URL);
      } else {
        const vDiferent = existingNode.validator !== validatedData.validator;
        const vpDifferent = existingNode.validatorPublic !== validatedData.validatorPublic;

        // if the keys are different
        if (vDiferent || vpDifferent) {
          const e =
            `The validator${vDiferent ? " public" : ""} key exists in one of your inactive nodes, ` +
            `but the validator${vDiferent ? "" : " public"} key provided is different. ` +
            `Its value is: ${vDiferent ? existingNode.validator : existingNode.validatorPublic}`;
          ctx.state.session.flash("errors", [await newZodError(vDiferent ? "validator" : "validatorPublic", e)]);
          return redirect(THIS_URL);
        }
      }
    }

    if (IS_PRODUCTION)
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
  const { confirmationExpires, balance, prvToPay, errors, inactiveNodes } = data;

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

      <NewConfirmNodeSelector
        inactiveNodes={inactiveNodes}
        validatorError={validatorError?.message}
        validatorPublicError={validatorPublicError?.message}
        validatorRegex={IncognitoCli.validatorKeyRegex.source}
        validatorPublicRegex={IncognitoCli.validatorPublicKeyRegex.source}
        defaultValidator={data.defaultValidator}
        defaultValidatorPublic={data.defaultValidatorPublic}
      />
    </>
  );
}
