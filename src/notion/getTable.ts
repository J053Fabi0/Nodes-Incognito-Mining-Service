import notion from "./notion.ts";

export default async function getTable(database_id: string, next_cursor?: string) {
  const query = await notion.databases.query({ database_id, start_cursor: next_cursor });
  const results: typeof query.results = [...query.results];

  if (query.has_more && query.next_cursor) results.push(...(await getTable(database_id, query.next_cursor)));

  return results;
}
