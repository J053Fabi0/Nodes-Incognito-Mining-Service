type ArrayOfUnion<T> = T extends any ? T[] : never;
export default ArrayOfUnion;
