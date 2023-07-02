import dayjs from "dayjs/mod.ts";
import capitalizeFn from "../utils/capitalize.ts";
import relativeTime from "dayjs/plugin/relativeTime.ts";

dayjs.extend(relativeTime);

interface RelativeDateProps {
  date: string | number;
  /** Capitalize the first letter */
  capitalize?: boolean;
}

export default function RelativeDate({ date, capitalize }: RelativeDateProps) {
  const t = dayjs(date).fromNow();
  return <>{capitalize ? capitalizeFn(t) : t}.</>;
}
