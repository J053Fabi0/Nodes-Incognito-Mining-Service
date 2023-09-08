import updateDockers from "../crons/updateDockers.ts";

export default async function diffuse() {
  await updateDockers();
}
