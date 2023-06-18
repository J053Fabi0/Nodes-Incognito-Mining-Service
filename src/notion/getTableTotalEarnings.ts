import getTable from "./getTable.ts";

/**
 * Returns the sum of the earnings values in the table.
 */
const getTableTotalEarnings = async (database_id: string) =>
  (await getTable(database_id))
    .map((a) => (a.properties["Total earnings"].type === "number" && a.properties["Total earnings"].number) || 0)
    .reduce((p, c) => p + c, 0);

export default getTableTotalEarnings;
