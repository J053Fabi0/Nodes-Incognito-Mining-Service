import ArrayOfUnion from "../types/ArrayOfUnion.type.ts";
import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import duplicatedFilesCleaner from "../../duplicatedFilesCleaner.ts";

interface GenericOptions<T> {
  name?: string;
  pluralName?: string;
  validItems?: ArrayOfUnion<T>;
  rawItems: string[] | number[];
}

/**
 * Validates an array of items against an array of valid items and returns the valid items. If an item is not valid, it will send an error message and throw an error.
 * @param name Name of the item. Example: "node".
 * @param pluralName Plural name of the item. Example: "nodes". Defaults to `${name}s`.
 * @param validItems Array of valid items. Example: [1, 2, 3]. Defaults to duplicatedFilesCleaner.usedNodes.
 * @param rawItems Array of raw items to validate. Example: ["1", "2", "3"].
 * @returns Array of valid items parsed to the type of the original valid items.
 */
export default async function validateItems<T extends string | number = number>({
  rawItems,
  validItems,
  name = "node",
  pluralName = `${name}s`,
}: GenericOptions<T>) {
  // @ts-ignore - duplicatedFilesCleaner.usedNodes will always be a suitable default for validItems
  if (!validItems) validItems = [...duplicatedFilesCleaner.usedNodes];

  if (rawItems.length === 0 || validItems.length === 0) return [];

  // @ts-ignore - items will always be the same type as validItems
  const items: T[] = [];

  for (const rawItem of rawItems) {
    const numberOrStringItem = typeof validItems[0] === "number" ? Number(rawItem) : (rawItem as string);
    // @ts-ignore - numberOrStringItem will always be the same type as validItems
    if (!validItems.includes(numberOrStringItem)) {
      await sendHTMLMessage(
        `${name.substring(0).toUpperCase() + name.substring(1).toLowerCase()} ` +
          `<code>${rawItem}</code> is not found.\n\n` +
          `Valid ${pluralName}:\n- <code>${validItems.join("</code>\n- <code>")}</code>`
      );
      throw new Error(`Node ${rawItem} not found`);
    }

    // @ts-ignore - numberOrStringItem will always be the same type as items
    items.push(numberOrStringItem);
  }

  return items;
}
