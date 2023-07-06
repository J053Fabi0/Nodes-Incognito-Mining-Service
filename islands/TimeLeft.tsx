import dayjs from "dayjs/mod.ts";
import { useSignal } from "@preact/signals";
import relativeTime from "dayjs/plugin/relativeTime.ts";
import { rangeMsToTimeDescription } from "../utils/msToTimeDescription.ts";

dayjs.extend(relativeTime);

interface TimeLeftProps {
  date: number;
}

export default function TimeLeft({ date }: TimeLeftProps) {
  const time = useSignal<string>(rangeMsToTimeDescription(date));
  const interval = useSignal<number | undefined>(undefined);

  // Don't run this on the server
  if (!globalThis.Deno)
    interval.value = setInterval(() => {
      const newValue = date <= Date.now() ? "Expired. Reload to retry" : rangeMsToTimeDescription(new Date(date));

      if (time.peek() !== newValue) {
        clearInterval(interval.value);
        time.value = newValue;
      }
    }, 1000);

  return <>{time.value}</>;
}
