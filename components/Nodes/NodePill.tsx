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

export interface NodePillProps extends JSX.HTMLAttributes<HTMLAnchorElement & HTMLSpanElement> {
  nodeNumber: number;
  /** Wether or not to add a relative param to the URL */
  relative: boolean;
  /**
   * The base URL to use for the node pill.
   * If it's null, the node pill will not be clickable.
   * `baseURL + "/${nodeNumber}"`
   * */
  baseURL: string | null;
}

export default function NodePill({ baseURL, relative, nodeNumber, class: classes, ...props }: NodePillProps) {
  const style = `${classes ?? ""} ${baseURL === null ? "" : "cursor-pointer"}`;

  const pill = (
    <Pill color={NODE_PILL_COLORS[(nodeNumber - 1) % NODE_PILL_COLORS.length]}>
      <code>{nodeNumber}</code>
    </Pill>
  );

  return baseURL === null ? (
    <span class={style} {...(props as unknown as JSX.HTMLAttributes<HTMLSpanElement>)}>
      {pill}
    </span>
  ) : (
    <a href={`${baseURL}/${nodeNumber}${relative ? "?relative" : ""}`} class={style} {...props}>
      {pill}
    </a>
  );
}
