import { sendHTMLMessage } from "../telegram/sendMessage.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";

interface GenericOptions {
  name?: string;
  pluralName?: string;
  rawItems: string[] | number[];
  validItems?: (number | string)[];
}

/**
 * Validates an array of items against an array of valid items and returns the valid items. If an item is not valid, it will send an error message and throw an error.
 * @param name Name of the item. Example: "node".
 * @param pluralName Plural name of the item. Example: "nodes". Defaults to `${name}s`.
 * @param validItems Array of valid items. Example: [1, 2, 3]. Defaults to duplicatedFilesCleaner.dockerIndexes.
 * @param rawItems Array of raw items to validate. Example: ["1", "2", "3"].
 * @returns Array of valid items parsed to the type of the original valid items.
 */
export default async function validateItems<T extends string | number = number>({
  rawItems,
  validItems,
  name = "node",
  pluralName = `${name}s`,
}: GenericOptions) {
  if (!validItems) validItems = [...duplicatedFilesCleaner.dockerIndexes];

  if (rawItems.length === 0 || validItems.length === 0) return [];

  const items: T[] = [];

  for (const rawItem of rawItems) {
    const numberOrStringItem = typeof validItems[0] === "number" ? Number(rawItem) : (rawItem as string);
    if (!validItems.includes(numberOrStringItem)) {
      const error =
        `${name[0].toUpperCase() + name.substring(1).toLowerCase()} ` +
        `<code>${rawItem}</code> is not found.\n\n` +
        `Valid ${pluralName}:\n- <code>${validItems.join("</code>\n- <code>")}</code>`;

      await sendHTMLMessage(error);
      throw new Error(error);
    }

    items.push(numberOrStringItem as T);
  }

  return items;
}
