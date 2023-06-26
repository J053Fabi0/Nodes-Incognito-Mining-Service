/**
 * Reverses an array without mutating the original
 */
export default function reverse<T>(arr: T[]): T[] {
  return arr.slice().reverse();
}
