import capitalize from "../utils/capitalize.ts";

/** Converts an object into a readable text format */
export default function objectToTableText(obj: Record<string, string | number | boolean>): string;
export default function objectToTableText(
  obj: Record<string, string | number | boolean>,
  pre: string,
  post: string
): string;
export default function objectToTableText(
  obj: Record<string, string | number | boolean>,
  pre = "",
  post = ""
): string {
  const keys = Object.keys(obj);
  // maxLength in the keys
  const maxLength = Math.max(...keys.map((key) => key.length));

  return keys.reduce(
    (text, key, i) =>
      (text +=
        `${pre}${capitalize(key)}${post}${pre}:${" ".repeat(maxLength - key.length + 1)}` +
        `${post}${pre}${obj[key]}${post}${i === keys.length - 1 ? "" : "\n"}`),
    ""
  );
}
