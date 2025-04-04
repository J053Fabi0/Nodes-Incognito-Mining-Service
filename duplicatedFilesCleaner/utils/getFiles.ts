export type LDBFile = Deno.DirEntry & { number: number };

/**
 * Get all the .ldb files from a folder sorted by number from highest to lowest.
 * @param path The path to the folder.
 * @returns The .ldb files.
 */
export default function getFiles(path: string) {
  const files = [...readOrCreateDirSync(path)]
    // only get the .ldb files
    .filter((a) => a.name.endsWith(".ldb")) as LDBFile[];

  // add the number to the object
  for (const file of files) file.number = Number(file.name.substring(0, file.name.length - 4));

  // sort by number from highest to lowest
  return files.sort((a, b) => b.number - a.number);
}

function readOrCreateDirSync(path: string) {
  try {
    return Deno.readDirSync(path);
  } catch {
    Deno.mkdirSync(path, { recursive: true });
    return Deno.readDirSync(path);
  }
}
