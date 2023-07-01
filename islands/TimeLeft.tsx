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
  const interval = useSignal<number | null>(null);

  if (interval.value === null)
    interval.value = setInterval(() => {
      if (date <= Date.now()) {
        time.value = "Expired. Reload to retry";
        // clear the interval without clearing the signal, so that it doesn't get reinitialized
        clearInterval(interval.value!);
      } else time.value = rangeMsToTimeDescription(new Date(date));
    }, 1000);

  return <>{time.value}</>;
}
