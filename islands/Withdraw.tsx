import { JSX } from "preact";
import { BiExport } from "react-icons/bi";
import { useSignal } from "@preact/signals";
import Button from "../components/Button.tsx";
import { toFixedS } from "../utils/numbersString.ts";
import Typography, { getTypographyClass } from "../components/Typography.tsx";

const styles = {
  label: `whitespace-nowrap flex items-center gap-2 ${getTypographyClass("p")}`,
};

interface WidthdrawProps {
  balance: number;
  incognitoFee: number;
  paymentAddressPattern: string;
}

export default function Withdraw({ balance, incognitoFee }: WidthdrawProps) {
  const amountStr = useSignal<undefined | string>(undefined);
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
            class="p-2 border border-gray-300 rounded w-full"
          />
        </div>

        <div>
          <label for="validatorPublic" class={styles.label}>
            Amount (max:{" "}
            <code class="hover:underline hover:cursor-pointer" onClick={() => (amountStr.value = `${max}`)}>
              {toFixedS(max, 9)}
            </code>{" "}
            PRV)
          </label>

          <input
            required
            max={max}
            min={1e-9}
            type="number"
            id="validatorPublic"
            onBlur={handleChange}
            name="validatorPublic"
            value={amountStr.value}
            class="p-2 border border-gray-300 rounded w-full"
          />
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
