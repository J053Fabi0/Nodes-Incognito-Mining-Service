interface GetInputProps {
  id: string;
  value: string | number;
  placeholder?: string;
}

export default function GetInput({ id, value, placeholder }: GetInputProps) {
  const isNumber = typeof value === "number" || !isNaN(+value);
  return (
    <input
      id={id}
      required
      name={id}
      value={value}
      placeholder={placeholder}
      type={isNumber ? "number" : "text"}
      step={isNumber ? "0.1" : undefined}
      class="px-2 w-full bg-white/50 rounded"
    />
  );
}
