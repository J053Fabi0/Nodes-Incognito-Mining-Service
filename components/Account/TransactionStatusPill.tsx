import { JSX } from "preact";
import Pill, { PillProps } from "../Pill.tsx";
import { AccountTransactionStatus } from "../../types/collections/accountTransaction.type.ts";

const COLORS: Record<AccountTransactionStatus, PillProps["color"]> = {
  failed: "red",
  pending: "yellow",
  completed: "green",
};

const STATUS_TEXT: Record<AccountTransactionStatus, string> = {
  failed: "Failed",
  pending: "Pending",
  completed: "Completed",
};

export interface TransactionStatusPillProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  status: AccountTransactionStatus;
}

export default function TransactionStatusPill({ status, class: classes, ...props }: TransactionStatusPillProps) {
  return (
    <span class={classes} {...(props as unknown as JSX.HTMLAttributes<HTMLSpanElement>)}>
      <Pill color={COLORS[status]}>
        <code>{STATUS_TEXT[status]}</code>
      </Pill>
    </span>
  );
}
