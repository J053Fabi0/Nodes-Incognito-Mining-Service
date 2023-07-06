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
  const interval = useSignal<number | undefined>(undefined);
  const t = useSignal<string>(dayjs(date).fromNow());

  // Don't run this on the server
  if (!globalThis.Deno)
    interval.value = setInterval(() => {
      const newT = dayjs(date).fromNow();

      if (newT !== t.peek()) {
        clearInterval(interval.value);
        t.value = newT;
      }
    }, 1_000);

  return <>{capitalize ? capitalizeFn(t.value) : t.value}.</>;
}
