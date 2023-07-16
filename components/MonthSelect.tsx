interface MonthSelectProps {
  /** From 0 to 11 */
  month: number;
  id: string;
  class?: string;
}

export default function MonthSelect({ month, id, class: classes }: MonthSelectProps) {
  return (
    <select id={id} name={id} class={classes}>
      <option value="0" selected={month === 0}>
        January
      </option>
      <option value="1" selected={month === 1}>
        February
      </option>
      <option value="2" selected={month === 2}>
        March
      </option>
      <option value="3" selected={month === 3}>
        April
      </option>
      <option value="4" selected={month === 4}>
        May
      </option>
      <option value="5" selected={month === 5}>
        June
      </option>
      <option value="6" selected={month === 6}>
        July
      </option>
      <option value="7" selected={month === 7}>
        August
      </option>
      <option value="8" selected={month === 8}>
        September
      </option>
      <option value="9" selected={month === 9}>
        October
      </option>
      <option value="10" selected={month === 10}>
        November
      </option>
      <option value="11" selected={month === 11}>
        December
      </option>
    </select>
  );
}
