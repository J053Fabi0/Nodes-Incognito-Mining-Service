export default function doesDirExists(dir: string): Promise<boolean> {
  return Deno.stat(dir)
    .then(() => true)
    .catch(() => false);
}
