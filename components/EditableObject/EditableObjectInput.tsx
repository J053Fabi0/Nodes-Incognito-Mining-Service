import GetInput from "./GetInput.tsx";
import { getTypographyClass } from "../Typography.tsx";
import GetDateInput from "../../islands/EditableObject/GetDateInput.tsx";

const styles = {
  label: `whitespace-nowrap flex items-center gap-2 max-w-[40%] font-semibold ${getTypographyClass("p")}`,
};

interface InputProps {
  value: string;
  name: string;
  path: string;
}

const dateKeys = ["expires", "removeOnDate", "from", "createdAt", "date", "lastAccesed"];
const keysToIgnore = ["handler"];

export default function EditableObjectInput({ name, value, path }: InputProps) {
  if (keysToIgnore.includes(name)) return null;

  const isDate = dateKeys.includes(name);
  const id = path ? `${path}.${name}` : name;

  return (
    <form method="POST">
      <div class={`flex gap-2 font-mono flex-wrap md:flex-nowrap`}>
        <label for="validator" class={styles.label}>
          <p class="truncate text-ellipsis">{name}:</p>
        </label>

        {!isDate ? <GetInput id={id} value={value} /> : <GetDateInput value={value} id={id} />}
      </div>
    </form>
  );
}
