export default function getMinutesSinceError(date: Date) {
  return (Date.now() - +date) / 1000 / 60;
}
