export default function LocaleDate({ date }: { date: string | number }) {
  const dateObj = new Date(date);
  return <>{dateObj.toLocaleString()}</>;
}
