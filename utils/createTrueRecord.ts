import { AcceptedRecord } from "./getRedisValue.ts";

export const notAssignableKeys = ["toJSON"];

export default function createTrueRecord<R extends AcceptedRecord>(
  record: R,
  defaultValue: (key: string) => R[keyof R],
  // deno-lint-ignore no-explicit-any
  setter?: (target: R, p: string | symbol, newValue: any, receiver: any) => boolean
) {
  return new Proxy(record, {
    get: (target, key) => {
      if (typeof key === "symbol" || notAssignableKeys.includes(key)) return Reflect.get(target, key);
      const a = Reflect.get(target, key);
      if (!a) return (target[key as keyof R] = defaultValue(key));
      return a;
    },
    set: setter,
  });
}
