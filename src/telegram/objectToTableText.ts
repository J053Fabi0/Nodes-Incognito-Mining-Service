/** Convert an object to a table text */
export default function objectToTableText(obj: Record<string, string | number>) {
  const keys = Object.keys(obj);
  // maxLength in the keys
  const maxLength = Math.max(...keys.map((key) => key.length));

  return keys.reduce(
    (text, key) =>
      (text +=
        `${key.charAt(0).toUpperCase()}${key.slice(1).toLocaleLowerCase()}:` +
        `${" ".repeat(maxLength - key.length + 1)}${obj[key]}\n`),
    ""
  );
}
