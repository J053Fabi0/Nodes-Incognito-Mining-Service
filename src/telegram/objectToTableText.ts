/** Converts an object into a readable text format */
export default function objectToTableText(obj: Record<string, string | number | boolean>) {
  const keys = Object.keys(obj);
  // maxLength in the keys
  const maxLength = Math.max(...keys.map((key) => key.length));

  return keys.reduce(
    (text, key) =>
      (text +=
        `${key.charAt(0).toUpperCase()}${key.slice(1).toLowerCase()}:` +
        `${" ".repeat(maxLength - key.length + 1)}${obj[key]}\n`),
    ""
  );
}
