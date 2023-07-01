import axiod from "axiod";
import { useSignal } from "@preact/signals";
import { toFixedS } from "../utils/numbersString.ts";

interface BalanceProps {
  /** Int format */
  initialBalance?: number;
  /** With https and without traising slash */
  websiteUrl?: string;
  /** When the goal is met, redirectTo. Decimal format */
  goal: number;
  redirectTo: string;
}

function checkGoal(goal: number, balance: number, redirectTo: string): void {
  if (balance >= goal) window.location.href = redirectTo;
}

export default function Balance({ initialBalance = 0, websiteUrl, goal, redirectTo }: BalanceProps) {
  const interval = useSignal<number | null>(null);
  // Balance in decimal format
  const balance = useSignal<number>(initialBalance / 1e9);

  if (interval.value === null)
    interval.value = setInterval(async () => {
      const { data } = await axiod.get<{ balance: number }>(`${websiteUrl}/balance`);
      balance.value = data.balance / 1e9;
      checkGoal(goal, balance.value, redirectTo);
    }, 6_000);

  return <>{toFixedS(balance.value, 9)}</>;
}
