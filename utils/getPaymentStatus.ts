import { ObjectId } from "mongo/mod.ts";
import hasClientPayed from "./hasClientPayed.ts";
import getIsTimeToPay from "./getIsTimeToPay.ts";
import { monthlyPayments } from "./variables.ts";
import { PaymentStatus } from "../islands/Nodes/TimeToPay.tsx";

export default function getPaymentStatus(
  userId: string | ObjectId,
  lastPayment: Date,
  isTimeToPay = getIsTimeToPay()
): PaymentStatus {
  // this value does not take in account if is time to pay or not
  const absoluteValue = (() => {
    if (monthlyPayments[`${userId}`].errorInTransaction) return PaymentStatus.ERROR;

    if (hasClientPayed(lastPayment)) return PaymentStatus.PAYED;

    return PaymentStatus.PENDING;
  })();

  if (isTimeToPay) return absoluteValue;

  // it'll be expired if it's not time to pay and the client has not payed
  if (absoluteValue === PaymentStatus.PENDING) return PaymentStatus.EXPIRED;

  return absoluteValue;
}
