/**
 * @returns Decimal number of minutes since the given date
 */
export default function getMinutesSinceError(date: Date | number) {
  return (Date.now() - +date) / 1000 / 60;
}
