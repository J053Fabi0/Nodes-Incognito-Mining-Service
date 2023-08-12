import copyPendingBeacons from "../crons/copyPendingBeacons.ts";

export default async function diffuse() {
  await copyPendingBeacons();
}
