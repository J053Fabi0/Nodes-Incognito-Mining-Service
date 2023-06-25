import { JSX } from "preact";
import { ShadedColors } from "../twind.config.ts";

interface SwitchProps {
  checked: boolean;
  size?: number;
  color?: ShadedColors;
}

export default function Switch({
  size = 20,
  checked,
  color = "blue",
  class: classes = "",
  ...props
}: JSX.HTMLAttributes<HTMLButtonElement> & SwitchProps) {
  const buttonClass = `
    h-[${size * 0.7}px] w-[${size * 2}px] relative
    my-[${(size - size * 0.7) / 2}px] rounded-full
    bg-${checked ? `${color}-200` : "slate-300"}
    cursor-pointer
  `;

  const circleClass = `
    h-[${size}px] w-[${size}px]
    bg-${checked ? `${color}-400` : "slate-500"}
    rounded-full
    absolute top-[-${size * 0.15}px] ${checked ? "left" : "right"}-0
  `;

  return (
    <div class={classes}>
      <button {...props} class={buttonClass}>
        <div class={circleClass} />
      </button>
    </div>
  );
}
