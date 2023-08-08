/**
 * Checks if the given value is an Error.
 */
export default function isError(e: unknown): e is Error {
  return e instanceof Error;
}
