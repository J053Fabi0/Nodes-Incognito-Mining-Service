import axiod from "axiod";
import { JSX } from "preact";
import { useSignal, useComputed } from "@preact/signals";
import { moveDecimalDot, toFixedS } from "../utils/numbersString.ts";

interface CommonProps {
  /** Int format */
  initialBalance: number;

  /** Amount to substract from the balance. Int format */
  substract?: number;
}

interface BalanceRedirectProps extends CommonProps {
  /** With https and without traising slash */
  websiteUrl: string;
  /** When the goal is met, redirectTo. Decimal format */
  goal: number;
  redirectsTo: string;
  /**
   * Redirect when the balance is lower than the goal, instead of the balance being greater or equal to the goal
   * which is the default
   */
  whenLowerThanGoal?: boolean;
}

interface BalanceProps extends CommonProps {
  /** With https and without traising slash */
  websiteUrl?: never;
  /** When the goal is met, redirectTo. Decimal format */
  goal?: never;
  redirectsTo?: never;
  /**
   * Redirect when the balance is lower than the goal, instead of the balance being greater or equal to the goal
   * which is the default
   */
  whenLowerThanGoal?: never;
}

function checkGoal(goal: number, balance: number, redirectTo: string, whenLowerThanGoal: boolean): void {
  if (whenLowerThanGoal ? balance < goal : balance >= goal) window.location.href = redirectTo;
}

export default function Balance(options: BalanceRedirectProps | BalanceProps): JSX.Element {
  const interval = useSignal<number | null>(null);
  /** Balance Int format */
  const balance = useSignal<number>(typeof options.initialBalance === "number" ? options.initialBalance : 0);

  if (interval.value === null && "goal" in options && typeof options.goal === "number")
    interval.value = setInterval(async () => {
      const { data } = await axiod.get<{ balance: number }>(`${options.websiteUrl}/balance`);
      balance.value = data.balance;
      checkGoal(options.goal * 1e9, balance.value, options.redirectsTo, options.whenLowerThanGoal ?? false);
    }, 6_000);

  const finalBalance = useComputed(() => {
    if (typeof options.substract === "number") return balance.value - options.substract;
    return balance.value;
  });

  return <>{toFixedS(moveDecimalDot(finalBalance.value, -9), 9)}</>;
}
