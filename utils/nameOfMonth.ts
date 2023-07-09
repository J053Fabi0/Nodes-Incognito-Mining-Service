export enum Month {
  January = "January",
  February = "February",
  March = "March",
  April = "April",
  May = "May",
  June = "June",
  July = "July",
  August = "August",
  September = "September",
  November = "November",
  December = "December",
}

export default function nameOfMonth(date = new Date()): Month {
  switch (date.getUTCMonth()) {
    case 0:
      return Month.January;
    case 1:
      return Month.February;
    case 2:
      return Month.March;
    case 3:
      return Month.April;
    case 4:
      return Month.May;
    case 5:
      return Month.June;
    case 6:
      return Month.July;
    case 7:
      return Month.August;
    case 8:
      return Month.September;
    case 9:
      return Month.November;
    case 10:
      return Month.December;
    default:
      return "" as never;
  }
}
