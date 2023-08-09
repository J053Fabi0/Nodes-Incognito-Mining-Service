// deno-lint-ignore-file no-explicit-any
export type Methods = "push" | "pop" | "unshift" | "shift" | "splice" | "length" | "lengths";

export type EventedArrayWithoutHandler<Type = any> = Omit<EventedArray<Type>, Methods>;

/** Handler for EventedArray */
export type Handler<Type = any> = ({}: {
  /** The items added, if aplicable */
  added: Type[] | null;
  /** The items removed, if aplicable */
  removed: Type[] | null;
  /** The array itself */
  array: EventedArrayWithoutHandler<Type>;
  method: Methods;
}) => void;

export default class EventedArray<Type = any> extends Array<Type> {
  #handlerFunction: Handler<Type>;

  /**
   *
   * @param handler This function will be called when items are added or removed.
   * @param items Items to add to the array or the initial length of the array.
   */
  constructor(handler: Handler<Type>, ...items: [number] | Type[]) {
    super(...(items as Type[]));
    if (typeof handler !== "function") {
      console.error(new Error("The handler must be a function."), handler, typeof handler);
      handler = () => {};
    }
    this.#handlerFunction = handler;
  }

  push(...items: Type[]): number {
    super.push(...items);
    this.#handlerFunction({ array: this, added: items, removed: null, method: "push" });
    return this.lengthNoEvent;
  }
  pushNoEvent(...items: Type[]): number {
    return super.push(...items);
  }

  pop(): Type | undefined {
    const length = this.lengthNoEvent; // this.length gets the length before the pop. Using super.length gets the length after the pop.
    const removed = length > 0 ? [super.pop() as Type] : [];
    this.#handlerFunction({ array: this, added: null, removed, method: "pop" });
    return length > 0 ? removed[0] : undefined;
  }
  popNoEvent(): Type | undefined {
    return super.pop();
  }

  unshift(...items: Type[]): number {
    super.unshift(...items);
    this.#handlerFunction({ array: this, added: items, removed: null, method: "unshift" });
    return this.lengthNoEvent;
  }
  unshiftNoEvent(...items: Type[]): number {
    return super.unshift(...items);
  }

  shift(): Type | undefined {
    const length = this.lengthNoEvent; // this.length gets the length before the shift. Using super.length gets the length after the shift.
    const removed = length > 0 ? [super.shift() as Type] : [];
    this.#handlerFunction({ array: this, added: null, removed, method: "shift" });
    return length > 0 ? removed[0] : undefined;
  }
  shiftNoEvent(): Type | undefined {
    return super.shift();
  }

  splice(start: number, deleteCount?: number): Type[];
  splice(start: number, deleteCount: number, ...items: Type[]): Type[];
  splice(start: number, deleteCount?: number, ...items: Type[]): Type[] {
    const deletedItems =
      typeof deleteCount === "undefined"
        ? this.spliceNoEvent(start)
        : this.spliceNoEvent(start, deleteCount, ...items);

    this.#handlerFunction({ array: this, added: items, removed: deletedItems, method: "splice" });
    return deletedItems;
  }
  spliceNoEvent(start: number, deleteCount?: number): Type[];
  spliceNoEvent(start: number, deleteCount: number, ...items: Type[]): Type[];
  spliceNoEvent(start: number, deleteCount?: number, ...items: Type[]): Type[] {
    const deletedItems: Type[] = [];
    const length = this.lengthNoEvent;
    if (start < 0) start = length + start;
    if (start < 0) start = 0;
    if (start > length) start = length;
    if (typeof deleteCount === "undefined") deleteCount = length - start;
    if (deleteCount < 0) deleteCount = 0;
    if (deleteCount > length - start) deleteCount = length - start;
    for (let i = start; i < start + deleteCount; i++) deletedItems.push(this[i]);
    for (let i = start + deleteCount; i < length; i++) this[i - deleteCount] = this[i];
    this.lengthNoEvent = length - deleteCount;
    if (typeof items !== "undefined") {
      for (let i = this.lengthNoEvent - 1; i >= start; i--) this[i + items.length] = this[i];
      for (let i = 0; i < items.length; i++) this[i + start] = items[i];
      this.lengthNoEvent = length - deleteCount + items.length;
    }

    return deletedItems;
  }

  filter<S extends Type>(predicate: (value: Type, index: number, array: Type[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: Type, index: number, array: Type[]) => unknown, thisArg?: any): Type[];
  // deno-lint-ignore no-unused-vars
  filter(predicate: unknown, thisArg?: unknown): Type[] {
    const filteredArray: Type[] = [];
    for (let i = 0; i < this.lengths; i++)
      if (typeof predicate !== "function" || predicate(this[i], i, this)) filteredArray.push(this[i]);
    return filteredArray;
  }

  // deno-lint-ignore no-unused-vars
  map<U>(callbackfn: (value: Type, index: number, array: Type[]) => U, thisArg?: any): U[] {
    const mappedArray: U[] = [];
    for (let i = 0; i < this.lengths; i++) mappedArray.push(callbackfn(this[i], i, this));
    return mappedArray;
  }

  slice(start?: number, end?: number): Type[] {
    const slicedArray: Type[] = [];
    for (let i = start ?? 0; i < (end ?? this.lengths); i++) slicedArray.push(this[i]);
    return slicedArray;
  }

  get lengths(): number {
    return this.length;
  }
  set lengths(value: number) {
    const removed = super.splice(value);
    this.#handlerFunction({ array: this, added: null, removed, method: "length" });
  }
  get lengthNoEvent(): number {
    return this.length;
  }
  set lengthNoEvent(value: number) {
    this.length = value;
  }

  /**
   * @deprecated Use `lengths` instead, to trigger the handler.
   */
  get length(): number {
    return this.length;
  }
  /**
   * @deprecated Use `lengths` instead, to trigger the handler.
   */
  set length(value: number) {
    this.length = value;
  }
}
