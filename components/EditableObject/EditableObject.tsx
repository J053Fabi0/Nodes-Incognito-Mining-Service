import Typography from "../Typography.tsx";
import capitalize from "../../utils/capitalize.ts";
import { Colors } from "../../utils/twindColors.ts";
import EditableObjectInput from "./EditableObjectInput.tsx";

interface EditableObjectProps {
  // deno-lint-ignore no-explicit-any
  object: any;
  level: number;
  path?: string;
  lastPath?: string[];
}

const COLORS: Colors[] = ["blue", "green", "yellow", "red", "purple", "pink"];

export default function EditableObject({ object, level, path = "", lastPath = [] }: EditableObjectProps) {
  if (typeof object !== "object" || object === null) return null;

  const color = COLORS[level % COLORS.length];
  const ml = +Boolean(level) * 2;

  return (
    <div class={`ml-[${ml}rem] p-1 border-2 border-${color}-400 rounded bg-${color}-100 flex flex-col gap-2`}>
      {Object.entries(object).map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          const [firstPath, ...restPath] = lastPath;
          const open = firstPath === key;
          return (
            <details open={open}>
              <summary class="truncate text-ellipsis">
                <Typography variant="lead" class="font-semibold inline">
                  {capitalize(key)}
                </Typography>
              </summary>
              <EditableObject
                object={value}
                level={level + 1}
                lastPath={open ? restPath : []}
                path={path ? `${path}.${key}` : key}
              />
            </details>
          );
        } else if (value !== null) return <EditableObjectInput name={key} value={`${value}`} path={path} />;
      })}
    </div>
  );
}
