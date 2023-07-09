import { AcceptedRecord } from "./getProxyAndRedisValue.ts";

export const notAssignableKeys = ["toJSON"];

export default function createTrueRecord<R extends AcceptedRecord>(
  record: R,
  defaultValue: () => R[keyof R],
  setter?: (target: R, p: string | symbol, newValue: any, receiver: any) => boolean
) {
  return new Proxy(record, {
    get: (target, key) => {
      if (typeof key === "symbol" || notAssignableKeys.includes(key)) return Reflect.get(target, key);
      const a = Reflect.get(target, key);
      if (!a) return (target[key as keyof R] = defaultValue());
      return a;
    },
    set: setter,
  });
}
