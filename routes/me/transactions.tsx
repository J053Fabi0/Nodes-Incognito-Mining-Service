import AccountTransaction, {
  AccountTransactionType,
  AccountTransactionStatus,
} from "../../types/collections/accountTransaction.type.ts";
import { JSX } from "preact";
import { ObjectId } from "mongo/mod.ts";
import { GiMoneyStack } from "react-icons/gi";
import State from "../../types/state.type.ts";
import Switch from "../../components/Switch.tsx";
import capitalize from "../../utils/capitalize.ts";
import { BiExport, BiImport } from "react-icons/bi";
import LocaleDate from "../../islands/LocaleDate.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import RelativeDate from "../../islands/RelativeDate.tsx";
import getQueryParams from "../../utils/getQueryParams.ts";
import { moveDecimalDot } from "../../utils/numbersString.ts";
import TransactionStatusPill from "../../components/Account/TransactionStatusPill.tsx";
import { getAccountTransactions } from "../../controllers/accountTransaction.controller.ts";
import { PendingTransaction, pendingTransactionsByAccount } from "../../incognito/submitTransaction.ts";

interface TransactionsProps {
  pendingTransactions: PendingTransaction[];
  /** Relative dates */
  relative: boolean;
  transactions: Pick<
    AccountTransaction,
    "type" | "amount" | "status" | "createdAt" | "errorDetails" | "details"
  >[];
}

const styles = {
  td: "border border-slate-300 py-2 px-3 overflow-x-auto",
  th: "border border-slate-400 px-4 py-2",
} as const;

export const handler: Handlers<TransactionsProps, State> = {
  async GET(req, ctx) {
    const params = getQueryParams(req.url);

    const pendingTransactions = pendingTransactionsByAccount[`${ctx.state.user!.account}`].sort(
      (a, b) => a.createdAt - b.createdAt
    );

    const transactions = await getAccountTransactions(
      {
        account: ctx.state.user!.account,
        _id: { $nin: pendingTransactions.map(({ transactionId }) => new ObjectId(transactionId)) },
      },
      {
        sort: { createdAt: -1 },
        projection: {
          _id: 0,
          type: 1,
          amount: 1,
          status: 1,
          details: 1,
          createdAt: 1,
          errorDetails: 1,
        },
      }
    );

    return ctx.render({
      transactions,
      pendingTransactions,
      relative: "relative" in params,
    });
  },
};

export default function Transactions({ data }: PageProps<TransactionsProps>) {
  const { pendingTransactions, transactions, relative } = data;

  return (
    <>
      <Typography variant="h1" class="mt-3 mb-5">
        Transactions
      </Typography>

      <div class="flex flex-wrap items-center gap-3 mt-1">
        <a href={`transactions/?${relative ? "" : "relative&"}page=${1}`}>
          <Switch checked={relative} size={20} color="sky" label="Relative dates" />
        </a>
      </div>

      <hr class="my-5" />

      <div class="overflow-x-auto">
        <table class="table-auto border-collapse border border-slate-400 w-full max-w-full">
          <thead>
            <tr>
              <th class={styles.th}>Amount</th>
              <th class={styles.th}>Type</th>
              <th class={styles.th}>Status</th>
              <th class={styles.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {pendingTransactions.map(({ amount, type, createdAt, details }) => (
              <tr>
                <td class={styles.td}>
                  <code>{moveDecimalDot(amount, -9)}</code>
                </td>
                <td class={styles.td}>
                  <div class="flex items-center gap-2">
                    {getTypeIcon(type)}
                    {capitalize(type)}
                  </div>
                </td>
                <td class={styles.td + " text-center max-w-[180px]"}>
                  <TransactionStatusPill status={AccountTransactionStatus.PENDING} />
                  {details && (
                    <>
                      <hr class="my-1" />
                      <Typography variant="smallP">{details}</Typography>
                    </>
                  )}
                </td>
                <td class={styles.td}>
                  {relative ? <RelativeDate capitalize date={createdAt} /> : <LocaleDate date={createdAt} />}
                </td>
              </tr>
            ))}
            {transactions.map(({ amount, type, status, createdAt, errorDetails, details }) => (
              <tr>
                <td class={styles.td}>
                  <code>{moveDecimalDot(amount, -9)}</code>
                </td>
                <td class={styles.td}>
                  <div class="flex items-center gap-2">
                    {getTypeIcon(type)}
                    {capitalize(type)}
                  </div>
                </td>
                <td class={styles.td + " text-center max-w-[180px]"}>
                  <TransactionStatusPill status={status} />
                  {(errorDetails || details) && (
                    <>
                      <hr class="my-1" />
                      <Typography variant="smallP">{errorDetails || details}</Typography>
                    </>
                  )}
                </td>
                <td class={styles.td}>
                  {relative ? <RelativeDate capitalize date={+createdAt} /> : <LocaleDate date={+createdAt} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function getTypeIcon(type: AccountTransactionType, size = 20): JSX.Element {
  switch (type) {
    case AccountTransactionType.DEPOSIT:
      return <BiImport size={size} />;
    case AccountTransactionType.WITHDRAWAL:
      return <BiExport size={size} />;
    case AccountTransactionType.EXPENSE:
      return <GiMoneyStack color="green" size={size} />;
    default:
      return null as never;
  }
}
