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
      console.error(new Error("The handler must be a function."));
      handler = () => {};
    }
    console.log("a", handler.toString());
    this.#handlerFunction = handler;
    console.log("b", this.#handlerFunction.toString());
  }

  push(...items: Type[]): number {
    super.push(...items);
    console.log("c", this.#handlerFunction);
    this.#handlerFunction({ array: this, added: items, removed: null, method: "push" });
    return this.length;
  }
  pushNoEvent(...items: Type[]): number {
    return super.push(...items);
  }

  pop(): Type | undefined {
    const length = this.length; // this.length gets the length before the pop. Using super.length gets the length after the pop.
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
    return this.length;
  }
  unshiftNoEvent(...items: Type[]): number {
    return super.unshift(...items);
  }

  shift(): Type | undefined {
    const length = this.length; // this.length gets the length before the shift. Using super.length gets the length after the shift.
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
    const deletedItems: Type[] =
      typeof deleteCount === "undefined" ? super.splice(start) : super.splice(start, deleteCount, ...items);

    this.#handlerFunction({ array: this, added: items, removed: deletedItems, method: "splice" });
    return deletedItems;
  }
  spliceNoEvent(start: number, deleteCount?: number): Type[];
  spliceNoEvent(start: number, deleteCount: number, ...items: Type[]): Type[];
  spliceNoEvent(start: number, deleteCount?: number, ...items: Type[]): Type[] {
    return typeof deleteCount === "undefined" ? super.splice(start) : super.splice(start, deleteCount, ...items);
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
  set length(value: number) {
    this.length = value;
  }
}
