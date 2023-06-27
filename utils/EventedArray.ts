/** Handler for EventedArray */
export type Handler<Type = any> = ({}: {
  /** The items added, if aplicable */
  added: Type[] | null;
  /** The items removed, if aplicable */
  removed: Type[] | null;
  /** The array itself */
  array: EventedArray<Type>;
  method: "push" | "pop" | "unshift" | "shift" | "splice" | "length";
}) => void;

export default class EventedArray<Type = any> extends Array {
  private handler: Handler<Type>;

  /**
   *
   * @param handler This function will be called when items are added or removed.
   * @param items Items to add to the array or the initial length of the array.
   */
  constructor(handler: Handler<Type>, ...items: [number] | Type[]) {
    super(...(items as number[]));
    this.handler = handler;
  }

  push(...items: Type[]) {
    super.push(...items);
    this.handler({ array: this, added: items, removed: null, method: "push" });
    return super.length;
  }

  pop() {
    const item = super.pop() as Type;
    this.handler({ array: this, added: null, removed: [item], method: "pop" });
    return item;
  }

  unshift(...items: Type[]) {
    super.unshift(...items);
    this.handler({ array: this, added: items, removed: null, method: "unshift" });
    return super.length;
  }

  shift() {
    const item = super.shift() as Type;
    this.handler({ array: this, added: null, removed: [item], method: "shift" });
    return item;
  }

  splice(start: number, deleteCount?: number): Type[];
  splice(start: number, deleteCount: number, ...items: Type[]): Type[];
  splice(start: number, deleteCount?: number, ...items: Type[]): Type[] {
    const deletedItems: Type[] =
      typeof deleteCount === "undefined" ? super.splice(start) : super.splice(start, deleteCount, ...items);

    this.handler({ array: this, added: items, removed: deletedItems, method: "splice" });
    return deletedItems;
  }

  get lengths() {
    return super.length;
  }
  set lengths(value: number) {
    const removed = super.splice(value);
    this.handler({ array: this, added: null, removed, method: "length" });
  }

  /**
   * @deprecated Use `lengths` instead, to trigger the handler.
   */
  get length() {
    return super.length;
  }
  set length(value: number) {
    super.length = value;
  }
}
