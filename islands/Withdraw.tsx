import { JSX } from "preact";
import { BiExport } from "react-icons/bi";
import { useSignal } from "@preact/signals";
import Button from "../components/Button.tsx";
import { toFixedS } from "../utils/numbersString.ts";
import Typography, { getTypographyClass } from "../components/Typography.tsx";

const styles = {
  label: `whitespace-nowrap ${getTypographyClass("p")}`,
};

interface WidthdrawProps {
  balance: number;
  amountError?: string;
  incognitoFee: number;
  paymentAddressPattern: string;
  /** Decimal format */
  defaultAmount?: string;
  defautlPaymentAddress?: string;
}

export default function Withdraw({
  balance,
  amountError,
  incognitoFee,
  defaultAmount,
  paymentAddressPattern,
  defautlPaymentAddress,
}: WidthdrawProps) {
  const amountStr = useSignal<undefined | string>(defaultAmount);
  const max = (balance - incognitoFee * 1e9) / 1e9;

  function handleChange(e: JSX.TargetedEvent<HTMLInputElement, Event>) {
    const value = e.currentTarget.valueAsNumber;
    amountStr.value = undefined; // reset the value to trigger the re-render

    if (value > (balance - incognitoFee * 1e9) / 1e9) {
      amountStr.value = (balance - incognitoFee * 1e9) / 1e9 + "";
    } else if (value < 1e-9) {
      amountStr.value = "0.000000001";
    } else {
      amountStr.value = e.currentTarget.value;
    }

    amountStr.value = toFixedS(amountStr.value, 9);
  }

  return (
    <form method="POST" class="mt-3">
      <div class="flex flex-col gap-3">
        <div>
          <label for="paymentAddress" class={styles.label}>
            Send to
          </label>

          <input
            required
            type="text"
            id="paymentAddress"
            name="paymentAddress"
            placeholder="Payment address"
            value={defautlPaymentAddress}
            pattern={paymentAddressPattern}
            class="p-2 border border-gray-300 rounded w-full"
          />
        </div>

        <div>
          <label for="amount" class={styles.label}>
            Amount (max:{" "}
            <code class="underline tabular-nums cursor-pointer" onClick={() => (amountStr.value = `${max}`)}>
              {toFixedS(max, 9)}
            </code>{" "}
            PRV)
          </label>

          <input
            required
            id="amount"
            type="number"
            name="amount"
            step="0.000000001"
            onBlur={handleChange}
            value={amountStr.value}
            class="p-2 border border-gray-300 rounded w-full"
          />
          {amountError && (
            <Typography variant="p" class="mt-1 text-red-600">
              {amountError}
            </Typography>
          )}
        </div>
      </div>

      <div class="flex justify-center mt-3 w-full">
        <Button type="submit" color="green" name="action" value="confirm" class="mt-3 !normal-case">
          <Typography variant="p" class="flex items-center gap-2">
            Send
            <BiExport size={20} />
          </Typography>
        </Button>
      </div>
    </form>
  );
}
