import notion from "./notion.ts";

/**
 * Creates a table and returns its new ID.
 */
const createTable = async (page_id: string, name: string) =>
  (
    await notion.databases.create({
      parent: { page_id },
      title: [{ text: { content: `${name} - 0` } }],
      properties: {
        "Epochs": { title: {} },
        "Date": { date: {} },
        "Total earnings": { number: { format: "number" } },
        "Node": { select: {} },
      },
      icon: { type: "emoji", emoji: "🤖" },
    })
  ).id;

export default createTable;
