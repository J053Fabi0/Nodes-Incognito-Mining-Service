import { JSX } from "preact";
import dayjs from "dayjs/mod.ts";
import "humanizer/ordinalize.ts";
import utc from "dayjs/plugin/utc.ts";
import LocaleDate from "../LocaleDate.tsx";
import Paper from "../../components/Paper.tsx";
import Typography from "../../components/Typography.tsx";
import Pill, { PillProps } from "../../components/Pill.tsx";
import { moveDecimalDot } from "../../utils/numbersString.ts";

dayjs.extend(utc);

export enum PaymentStatus {
  PAYED = "payed",
  ERROR = "error",
  PENDING = "pending",
}

const styles = {
  th: "py-2 px-3 text-right",
  td: "py-2 px-3 text-left",
};

interface TimeToPayProps {
  balance: number;
  monthlyFee: number;
  paymentStatus: PaymentStatus;
  maxNotPayedDays: number;
}
export default function TimeToPay({ balance, monthlyFee, paymentStatus, maxNotPayedDays }: TimeToPayProps) {
  const { text, pillColor, pillText } = ((): {
    text: string | JSX.Element;
    pillColor: Exclude<PillProps["color"], undefined>;
    pillText: string;
  } => {
    switch (paymentStatus) {
      case PaymentStatus.PAYED:
        return {
          pillColor: "green",
          pillText: PaymentStatus.PAYED.toUpperCase(),
          text: "The payment for the last month has been payed.",
        };

      case PaymentStatus.ERROR:
        if (balance >= monthlyFee)
          return {
            pillColor: "red",
            pillText: PaymentStatus.ERROR.toUpperCase(),
            text:
              "There has been an error while processing the payment, but we'll " +
              "handle it, you don't need to do anything, so long as you don't withdraw your balance.",
          };

      /* falls through */
      case PaymentStatus.PENDING:
        return {
          text:
            balance >= monthlyFee ? (
              "You have enough balance to pay the monthly fee. It'l be charged automatically."
            ) : (
              <>
                Please pay the monthly fee. If you don't, your node(s) will be stopped.
                <br />
                You have until{" "}
                <LocaleDate
                  date={dayjs()
                    .utc()
                    .startOf("month")
                    .add(maxNotPayedDays, "days")
                    .subtract(30, "minutes")
                    .valueOf()}
                />
                .
                <br />
                Visit{" "}
                <a href="/me" class="w-min whitespace-nowrap hover:underline text-blue-600">
                  your account
                </a>{" "}
                to do the deposit.
              </>
            ),
          pillColor: "yellow",
          pillText: PaymentStatus.PENDING.toUpperCase(),
        };
    }
  })();

  return (
    <Paper class="p-4 mb-5 bg-gray-50" shadow="lg">
      <Typography variant="lead">
        Last month payment status:{" "}
        <Pill color={pillColor}>
          <code>{pillText}</code>
        </Pill>
      </Typography>

      <Typography variant="p">{text}</Typography>

      {PaymentStatus.PAYED === paymentStatus ? null : (
        <table class="table-auto mt-5">
          <tbody>
            <tr>
              <th class={styles.th}>Balance</th>
              <td class={styles.td}>
                <code>{moveDecimalDot(balance, -9)}</code> PRV
              </td>
            </tr>
            <tr>
              <th class={styles.th}>Last month fee</th>
              <td class={styles.td}>
                <code>{moveDecimalDot(monthlyFee, -9)}</code> PRV
              </td>
            </tr>
            <tr>
              <th class={styles.th}>{balance >= monthlyFee ? "After automatic payment" : "Deposit at least"}</th>
              <td class={styles.td}>
                <code>{moveDecimalDot(Math.abs(balance - monthlyFee), -9)}</code> PRV
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </Paper>
  );
}
