import { ObjectId } from "mongo/mod.ts";
import getMonthlyFee from "./getMonthlyFee.ts";
import getPaymentStatus from "./getPaymentStatus.ts";
import { TimeToPayProps } from "../islands/Nodes/TimeToPay.tsx";
import { incognitoFeeInt, maxNotPayedDays } from "../constants.ts";
import { getAccountById } from "../controllers/account.controller.ts";

export default async function getTimeToPayData(
  userId: string | ObjectId,
  lastPayment: Date,
  account: string | ObjectId
): Promise<TimeToPayProps> {
  const paymentStatus = getPaymentStatus(userId, lastPayment);
  const monthlyFee = (await getMonthlyFee(new ObjectId(userId))) + incognitoFeeInt;
  const balance = (await getAccountById(account, { projection: { balance: 1, _id: 0 } }))!.balance;

  return {
    balance,
    monthlyFee,
    paymentStatus,
    maxNotPayedDays,
  };
}
