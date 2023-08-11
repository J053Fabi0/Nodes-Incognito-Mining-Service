import checkNotStakedNodes from "../crons/checkNotStakedNodes.ts";

export default async function diffuse() {
  await checkNotStakedNodes();
}
