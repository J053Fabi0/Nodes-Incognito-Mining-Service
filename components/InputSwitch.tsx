import { JSX } from "preact";
import { Head } from "$fresh/runtime.ts";
import twindColors, { ShadedColors } from "../utils/twindColors.ts";

interface SwitchProps extends JSX.HTMLAttributes<HTMLInputElement> {
  checked: boolean;
  size?: number;
  label?: string;
  color?: ShadedColors;
  input?: boolean;
  /** For the parent div. */
  class?: JSX.HTMLAttributes<HTMLInputElement>["class"];
}

const bgColors = (Object.keys(twindColors) as ShadedColors[]).reduce((obj, color) => {
  obj[color] = (size) => `
      input:checked + .bg-custom-${color}-${size} {
        background-color: ${twindColors[color][200]};
      }
      input:checked + .bg-custom-${color}-${size}:before {
        background-color: ${twindColors[color][400]};
        left: ${size - 26}px;
      }

      input:checked + .slider:before {
        -webkit-transform: translateX(26px);
        -ms-transform: translateX(26px);
        transform: translateX(26px);
      }
    `;
  return obj;
}, {} as Record<ShadedColors, (size: number) => string>);

export default function InputSwitch({
  label,
  checked,
  size = 20,
  color = "blue",
  class: classes = "",
  ...props
}: SwitchProps) {
  const styles = {
    label: `relative inline-block h-[${size * 0.7}px] w-[${size * 2}px]`,
    input: "opacity-0 w-0 h-0",
    span: `slider
      absolute cursor-pointer top-0 left-0 right-0 bottom-0
      bg-slate-300 rounded-full bg-custom-${color}-${size}
      transition-all duration-200 ease-out

      before:content-[""] before:h-[${size}px]
      before:w-[${size}px] before:rounded-full
      before:absolute before:top-[-${size * 0.15}px] before:left-[0px]
      before:bg-slate-500
      before:transition-all before:duration-200 before:ease-out
    `,
  };

  return (
    <>
      <Head>
        <style>{bgColors[color](size)}</style>
      </Head>

      <div class={classes}>
        <div class="flex items-center gap-2">
          <label class={styles.label}>
            <input {...props} checked={checked} type="checkbox" class={styles.input} />
            <span class={styles.span} />
          </label>

          {label && <p class="leading-none">{label}</p>}
        </div>
      </div>
    </>
  );
}
