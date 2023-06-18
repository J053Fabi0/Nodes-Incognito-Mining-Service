import { type SelectColor } from "https://deno.land/x/notion_sdk@v1.0.4/src/api-endpoints.ts";
import notion from "./notion.ts";
const colors: SelectColor[] = ["red", "blue", "yellow", "green", "purple", "pink", "orange", "brown", "gray"];

/**
 * Adds a new item to the specified database.
 */
const addItem = async (
  database_id: string,
  epoch: string | number,
  date: Date = new Date(),
  earnings: number,
  node: number
) =>
  await notion.pages.create({
    parent: { database_id: database_id },
    properties: {
      "Epochs": { title: [{ text: { content: epoch.toString() } }] },
      "Date": { date: { start: date.toISOString().substring(0, 10) } },
      "Total earnings": { number: earnings },
      "Node": { select: { name: node.toString(), color: colors[Math.max(node - 1, 0) % colors.length] } },
    },
  });

export default addItem;
