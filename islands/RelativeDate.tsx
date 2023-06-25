import dayjs from "dayjs/mod.ts";
import relativeTime from "dayjs/plugin/relativeTime.ts";
dayjs.extend(relativeTime);

interface RelativeDateProps {
  date: string | number;
}

export default function RelativeDate({ date }: RelativeDateProps) {
  return <>{dayjs(date).fromNow()}.</>;
}
