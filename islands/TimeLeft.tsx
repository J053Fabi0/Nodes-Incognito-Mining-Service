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

  setTimeout(() => {
    if (date <= Date.now()) {
      time.value = "Expired. Reload to retry";
    } else time.value = rangeMsToTimeDescription(new Date(date));
  }, 1000);

  return <>{time.value}</>;
}
