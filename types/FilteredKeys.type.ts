/** Get keys of type T whose values are assignable to type U */
type FilteredKeys<ToFilter, ToCompare> = {
  [Key in keyof ToFilter]: ToFilter[Key] extends ToCompare ? Key : never;
}[keyof ToFilter] &
  keyof ToFilter;

export default FilteredKeys;
