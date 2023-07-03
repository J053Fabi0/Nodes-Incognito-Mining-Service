export default function getMinutesSinceError(date: Date | number) {
  return (Date.now() - +date) / 1000 / 60;
}
