import { JSX } from "preact";
import Pill, { PillProps } from "../Pill.tsx";

export const NODE_PILL_COLORS: PillProps["color"][] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];

interface NodePillProps {
  nodeNumber: number;
  relative: boolean;
}

export default function NodePill({
  relative,
  nodeNumber,
  class: classes,
  ...props
}: JSX.HTMLAttributes<HTMLAnchorElement> & NodePillProps) {
  const style = `${classes ?? ""} cursor-pointer`;

  return (
    <a href={`nodes/${nodeNumber}${relative ? "?relative" : ""}`} class={style} {...props}>
      <Pill color={NODE_PILL_COLORS[(nodeNumber - 1) % NODE_PILL_COLORS.length]}>
        <code>{nodeNumber}</code>
      </Pill>
    </a>
  );
}
