import capitalize from "../utils/capitalize.ts";
import { Colors } from "../utils/twindColors.ts";
import Typography, { getTypographyClass } from "./Typography.tsx";

interface EditableObjectProps {
  // deno-lint-ignore no-explicit-any
  object: any;
  level: number;
  path?: string;
}

const styles = {
  label: `whitespace-nowrap flex items-center gap-2 max-w-[40%] font-semibold ${getTypographyClass("p")}`,
};

const COLORS: Colors[] = ["blue", "green", "yellow", "red", "purple", "pink"];

export default function EditableObject({ object, level, path = "" }: EditableObjectProps) {
  if (typeof object !== "object" || object === null) return null;

  const color = COLORS[level % COLORS.length];
  const ml = +Boolean(level) * 2;

  return (
    <div class={`ml-[${ml}rem] p-1 border-2 border-${color}-400 rounded bg-${color}-100 flex flex-col gap-1`}>
      {Object.entries(object).map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return (
            <>
              <Typography variant="lead" class="mt-3 font-semibold">
                {capitalize(key)}
              </Typography>
              <EditableObject object={value} level={level + 1} path={path ? `${path}.${key}` : key} />
            </>
          );
        } else if (value !== null) return <Input name={key} value={`${value}`} path={path} />;
      })}
    </div>
  );
}

interface InputProps {
  value: string;
  name: string;
  path: string;
}

function Input({ name, value, path }: InputProps) {
  const id = path ? `${path}.${name}` : name;
  return (
    <form method="POST">
      <div class={`flex gap-2 font-mono`}>
        <label for="validator" class={styles.label}>
          <p class="truncate text-ellipsis">{name}:</p>
        </label>

        <input required type="text" value={value} id={id} name={id} class="px-2 w-full bg-white/40 rounded" />
      </div>
    </form>
  );
}
