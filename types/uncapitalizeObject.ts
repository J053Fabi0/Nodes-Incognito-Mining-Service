type UncapitalizeObject<T> = {
  [K in keyof T as Uncapitalize<K & string>]: T[K];
};
export default UncapitalizeObject;
