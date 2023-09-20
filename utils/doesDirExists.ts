/**
 * Dir or file
 */
export default async function doesDirExists(dir: string): Promise<boolean> {
  return await Deno.stat(dir)
    .then(() => true)
    .catch(() => false);
}
