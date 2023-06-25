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

export default function NodePill({ nodeNumber, relative }: { nodeNumber: number; relative: boolean }) {
  return (
    <a href={`nodes/${nodeNumber}?${relative ? "relative&" : ""}`} class="cursor-pointer mr-2">
      <Pill color={NODE_PILL_COLORS[(nodeNumber - 1) % NODE_PILL_COLORS.length]}>
        <code>{nodeNumber}</code>
      </Pill>
    </a>
  );
}
