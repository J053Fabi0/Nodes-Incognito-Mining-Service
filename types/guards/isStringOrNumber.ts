export default function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
