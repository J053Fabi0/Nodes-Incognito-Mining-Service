import dayjs from "dayjs/mod.ts";
import { useSignal } from "@preact/signals";
import capitalizeFn from "../utils/capitalize.ts";
import relativeTime from "dayjs/plugin/relativeTime.ts";

dayjs.extend(relativeTime);

interface RelativeDateProps {
  date: string | number;
  /** Capitalize the first letter */
  capitalize?: boolean;
}

export default function RelativeDate({ date, capitalize }: RelativeDateProps) {
  const interval = useSignal<number | null>(null);
  const t = useSignal<string>(dayjs(date).fromNow());

  if (interval.value === null)
    interval.value = setInterval(() => {
      interval.value = null;
      t.value = dayjs(date).fromNow();
    }, 1_000);

  return <>{capitalize ? capitalizeFn(t.value) : t.value}.</>;
}
