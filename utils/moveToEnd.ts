/** Move to the end of the array all the elements that meet the condition */
export default function moveToEnd<T>(
  array: T[],
  condition: (element: T, index: number, array: T[]) => boolean
): T[] {
  const meet: T[] = [];
  const dontMeet: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const element = array[i];
    if (condition(element, i, array)) meet.push(element);
    else dontMeet.push(element);
  }

  return [...dontMeet, ...meet];
}
