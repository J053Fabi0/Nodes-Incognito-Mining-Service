import { JSX } from "preact";

interface GetInputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  id: string;
  value: string | number;
  placeholder?: string;
}

export default function GetInput({ id, value, placeholder, step, ...props }: GetInputProps) {
  const isNumber = typeof value === "number" || !isNaN(+value);
  return (
    <input
      {...props}
      id={id}
      required
      name={id}
      value={value}
      placeholder={placeholder}
      type={isNumber ? "number" : "text"}
      class="px-2 w-full bg-white/50 rounded"
      step={step ?? (isNumber ? "0.1" : undefined)}
    />
  );
}
