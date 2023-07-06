import { JSX } from "preact";
import { ShadedColors } from "../utils/twindColors.ts";

interface SwitchProps {
  checked: boolean;
  size?: number;
  label?: string;
  color?: ShadedColors;
}

export default function Switch({
  label,
  checked,
  size = 20,
  color = "blue",
  class: classes = "",
  ...props
}: JSX.HTMLAttributes<HTMLDivElement> & SwitchProps) {
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
    absolute top-[-${size * 0.15}px] ${checked ? "right" : "left"}-0
  `;

  return (
    <div class={classes}>
      <div class="flex items-center gap-2">
        <div {...props} class={buttonClass}>
          <div class={circleClass} />
        </div>

        {label && <p class="leading-none">{label}</p>}
      </div>
    </div>
  );
}
