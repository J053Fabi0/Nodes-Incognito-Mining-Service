import { JSX } from "preact";

const commonStyles = "py-0.5 px-2 rounded-lg font-semibold";
const colors = {
  red: "bg-redPastel",
  orange: "bg-orangePastel",
  yellow: "bg-yellowPastel",
  green: "bg-greenPastel",
  blue: "bg-bluePastel text-sky-800",
};

export interface PillProps {
  color?: keyof typeof colors;
}

export default function Pill({
  children,
  color = "blue",
  ...props
}: JSX.HTMLAttributes<HTMLSpanElement> & PillProps) {
  const style = `${commonStyles} ${colors[color]} ${props.class ?? ""}`;

  return (
    <span {...props} class={style}>
      {children}
    </span>
  );
}
