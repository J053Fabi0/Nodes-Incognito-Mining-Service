import notion from "./notion.ts";

/**
 * Creates a table and returns its new ID.
 */
const updateTablesName = (database_id: string, newName: string) =>
  notion.databases.update({
    database_id,
    title: [{ text: { content: newName } }],
  });

export default updateTablesName;
