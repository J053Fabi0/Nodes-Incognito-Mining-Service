import fixLowDiskSpace from "../incognito/fixLowDiskSpace.ts";

export default async function diffuse() {
  await fixLowDiskSpace(false, 2);
}
