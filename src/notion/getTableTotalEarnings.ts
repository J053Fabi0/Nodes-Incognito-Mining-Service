import getTable from "./getTable.ts";

/**
 * Returns the sum of the earnings values in the table.
 */
const getTableTotalEarnings = async (database_id: string) =>
  (await getTable(database_id))
    .map((a) => (a as { properties: Record<string, { number: number }> }).properties["Total earnings"].number)
    .reduce((p, c) => p + c, 0);

export default getTableTotalEarnings;
