import checkNotStakedNodes from "../crons/checkNotStakedNodes.ts";
import getPublicValidatorKey from "./getPublicValidatorKey.ts";

export default async function diffuse() {
  await checkNotStakedNodes().catch(console.error);
  console.log(await getPublicValidatorKey("200-64c96b3fb4dd2689f376fa56", 224).catch(console.error));
}
