import moment from "moment";
import { ObjectId } from "mongo/mod.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Balance from "../../islands/Balance.tsx";
import TimeLeft from "../../islands/TimeLeft.tsx";
import { prvToPay } from "../../utils/variables.ts";
import newZodError from "../../utils/newZodError.ts";
import handleError from "../../utils/handleError.ts";
import submitNode from "../../incognito/submitNode.ts";
import { toFixedS } from "../../utils/numbersString.ts";
import Node from "../../types/collections/node.type.ts";
import { IS_PRODUCTION, WEBSITE_URL } from "../../env.ts";
import isResponse from "../../types/guards/isResponse.ts";
import IncognitoCli from "../../incognito/IncognitoCli.ts";
import { sendHTMLMessage } from "../../telegram/sendMessage.ts";
import AfterYouPay from "../../components/Nodes/AfterYouPay.tsx";
import { getAccount } from "../../controllers/account.controller.ts";
import { changeClient } from "../../controllers/client.controller.ts";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { error, validateFormData, z, ZodIssue } from "fresh-validation";
import NewConfirmNodeSelector from "../../islands/NewConfirmNodeSelector.tsx";
import Typography, { getTypographyClass } from "../../components/Typography.tsx";
import { countNodes, getNode, getNodes } from "../../controllers/node.controller.ts";
import { adminTelegramUsername, incognitoFee, incognitoFeeInt, minutesOfPriceStability } from "../../constants.ts";

export const styles = {
  th: "py-2 px-3 text-right",
  td: "py-2 px-3 text-left",
  ol: `list-decimal list-inside mt-2 ${getTypographyClass("lead")} flex gap-2 flex-col`,
};

const NEW_URL = `${WEBSITE_URL}/nodes/new`;
const MONITOR_URL = `${WEBSITE_URL}/nodes/monitor`;
const THIS_URL = `${WEBSITE_URL}/nodes/new-confirm`;

interface NewNodeConfirmProps {
  /** Int format */
  balance: number;
  prvPrice: number;
  prvToPay: number;
  isAdmin: boolean;
  defaultValidator: string;
  confirmationExpires: number;
  errors: ZodIssue[] | undefined;
  inactiveNodes: Pick<Node, "number" | "validator">[];
}

async function getDataOrRedirect(
  ctx: HandlerContext<NewNodeConfirmProps, State>
): Promise<Response | NewNodeConfirmProps> {
  // return redirect(NEW_URL); // temporary

  const savedPrvPrice = prvToPay[ctx.state.userId!];
  const isAdmin = ctx.state.isAdmin;

  if (savedPrvPrice.prvToPay !== 0 && isAdmin) savedPrvPrice.prvToPay = 0;

  // the confirmation expires in the previous time plus an exatra minutesOfPriceStability
  const confirmationExpires = moment(savedPrvPrice.expires).utc().add(minutesOfPriceStability, "minute").valueOf();

  // if the confirmation expires, redirect to the new node page
  if (confirmationExpires <= Date.now()) return redirect(NEW_URL);

  const account = (await getAccount({ _id: ctx.state.user!.account }, { projection: { balance: 1, _id: 0 } }))!;

  const inactiveNodes = await getNodes(
    { inactive: true, client: ctx.state.user!._id },
    { projection: { validator: 1, number: 1 } }
  );

  // if it is not enough balance to pay for the node, redirect to the new node page
  if (account.balance < savedPrvPrice.prvToPay * 1e9) return redirect(NEW_URL);

  return {
    isAdmin,
    inactiveNodes,
    confirmationExpires,
    balance: account.balance,
    prvPrice: savedPrvPrice.usd,
    prvToPay: savedPrvPrice.prvToPay,
    errors: ctx.state.session.flash("errors"),
    defaultValidator: ctx.state.session.flash("defaultValidator"),
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
    const { errors, ...data } = await validateFormData(form, {
      validator: z.string().trim().regex(IncognitoCli.validatorKeyRegex, "Invalid validator key."),
    });
    const validatedData = data.validatedData as { validator: string };

    if (errors) {
      ctx.state.session.flash("errors", errors);
      return redirect(THIS_URL);
    }

    const existingNode = await getNode(
      { validator: validatedData.validator },
      { projection: { client: 1, validator: 1, inactive: 1 } }
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
      }
      // if the keys are different
      else if (existingNode.validator !== validatedData.validator) {
        const e =
          `The validator key exists in one of your inactive nodes, ` +
          `but the validator key provided is different. ` +
          `Its value is: ${existingNode.validator}`;
        ctx.state.session.flash("errors", [await newZodError("validator", e)]);
        return redirect(THIS_URL);
      }
    }

    if (IS_PRODUCTION)
      submitNode({
        clientId: ctx.state.user!._id,
        validator: validatedData.validator,
        cost: dataOrRedirect.prvToPay * 1e9 - incognitoFeeInt,
      })
        .then(async (data) => {
          if (data.success) {
            await sendHTMLMessage(
              `The user <code>${ctx.state.user!.name}</code> (<code>${ctx.state.user!.telegram}</code>) ` +
                `has registered a new node.\n\nIndex: <code>${data.dockerIndex}</code> - <code>#${data.number}</code>`
            );
            await sendHTMLMessage(
              `Your node <code>${data.number}</code> has been registered successfully. Stake it as soon as possible.\n\n` +
                `Here is it's URL: <code>${data.url}</code>.\n\n` +
                `Find instructions on how to stake it here: ${WEBSITE_URL}/nodes/monitor.`
            );
            await sendHTMLMessage(
              `Your node <code>${data.number}</code> has been registered successfully. Stake it as soon as possible.\n\n` +
                `Here is it's URL: <code>${data.url}</code>.\n\n` +
                `Find instructions on how to stake it here: ${WEBSITE_URL}/nodes/monitor.`,
              ctx.state.user!.telegram
            );

            const activeNodes = await countNodes({ client: new ObjectId(ctx.state.userId!), inactive: false });
            if (activeNodes === 0)
              await changeClient({ _id: new ObjectId(ctx.state.userId!) }, { $set: { lastPayment: new Date() } });
          }
        })
        .catch(async (e) => {
          handleError(e);
          await sendHTMLMessage(
            `The user <code>${ctx.state.user!.name}</code> (<code>${ctx.state.user!.telegram}</code>) ` +
              `failed to register a new node.\n\n`
          );
          // tell the user that the node was not registered
          await sendHTMLMessage(
            `Your node was not registered due to an error.\n\n` +
              `The administrator has been notified about this error. Send him a message if you want to get notified ` +
              `when the error is fixed: ${adminTelegramUsername}`,
            ctx.state.user!.telegram
          );
        });

    // delete default values if the values are valid
    ctx.state.session.flash("defaultValidator");
    return redirect(MONITOR_URL);
  },
};

export default function newConfirm({ data }: PageProps<NewNodeConfirmProps>) {
  const { confirmationExpires, balance, prvToPay, errors, inactiveNodes } = data;

  const validatorError = error(errors, "validator");

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
              {prvToPay > 0 ? (
                <>
                  <code>{toFixedS(prvToPay - incognitoFee, 2)}</code> PRV
                </>
              ) : (
                "Free"
              )}
            </td>
          </tr>
          {prvToPay > 0 && (
            <tr>
              <th class={styles.th}>Incognito fee</th>
              <td class={styles.td}>
                <code>{incognitoFee}</code> PRV
              </td>
            </tr>
          )}
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
        validatorRegex={IncognitoCli.validatorKeyRegex.source}
        defaultValidator={data.defaultValidator}
      />
    </>
  );
}
