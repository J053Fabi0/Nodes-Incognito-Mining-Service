import notion from "./notion.ts";
import nameOfMonth from "../utils/nameOfMonth.ts";

/**
 * Gets the ID of the latest table you need to edit. If the latest doesn't exist, it returns null.
 */
const getTableID = async (page_id: string, date: Date = new Date()) => {
  const tables = (await notion.blocks.children.list({ block_id: page_id })).results.filter(
    (e) => (e as { type: string }).type === "child_database"
  );
  const tablesIDs = tables.map(({ id }) => id);
  const tablesNames = tables.map((a) => (a as { child_database: Record<string, string> }).child_database.title);

  const currentTableName = new RegExp(`^${nameOfMonth(date)} ${date.getFullYear()}`);

  const indexOfTable = tablesNames.findIndex((v) => currentTableName.test(v));

  return indexOfTable === -1 ? null : tablesIDs[indexOfTable];
};

export default getTableID;
