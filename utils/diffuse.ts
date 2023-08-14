import copyPendingBeacons from "../incognito/copyPendingBeacons.ts";

export default async function diffuse() {
  await copyPendingBeacons();
}
