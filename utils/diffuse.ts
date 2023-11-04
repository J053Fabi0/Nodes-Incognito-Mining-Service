import checkMonthlyFee from "../crons/checkMonthlyFee.ts";

export default async function diffuse() {
  await checkMonthlyFee(false);
}
