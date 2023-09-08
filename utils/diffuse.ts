import updateDockers from "../crons/updateDockers.ts";

export default async function diffuse() {
  await updateDockers({
    force: true,
    dockerIndexes: Array.from({ length: 324 }).map((_, i) => i + 1),
  });
}
