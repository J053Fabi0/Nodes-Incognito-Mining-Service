import updateDockers from "../crons/updateDockers.ts";

export default async function diffuse() {
  await updateDockers({
    force: true,
    dockerIndexes: Array.from({ length: 325 })
      .map((_, i) => i)
      .slice(90),
  });
}
