import moment from "moment";

/**
 * @param month The month (0-11) that you want to check. By default it's the last month of the current date.
 * @returns If the client has payed this utc month
 */
export default function hasClientPayed(
  lastPayment: Date,
  month = moment().utc().subtract(1, "month").month()
): boolean {
  const lastPaymentMonth = moment(lastPayment).utc().month();
  // not '<=' because the payment of the lastPaymentMonth is for the month before it
  console.log({ lastPaymentMonth, month });
  return month < lastPaymentMonth;
}
