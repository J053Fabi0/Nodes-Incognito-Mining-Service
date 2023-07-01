import { JSX } from "preact";
import dayjs from "dayjs/mod.ts";
import utc from "dayjs/plugin/utc.ts";
import nameOfMonth from "../../utils/nameOfMonth.ts";

dayjs.extend(utc);

interface MonthlyEarningsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  monthEarnings: string[];
  horizontal?: boolean;
}

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3",
};

export default function MonthlyEarningsTable({
  horizontal,
  monthEarnings,
  class: classes,
  ...props
}: MonthlyEarningsProps) {
  const numberOfMonths = monthEarnings.length;
  const months = Array.from({ length: numberOfMonths })
    .map((_, i) => dayjs().utc().subtract(i, "month").startOf("month").toDate())
    .map((m) => nameOfMonth(m) + (numberOfMonths >= 13 ? ` ${m.getFullYear()}` : ""));

  const style = `overflow-x-auto ${classes ?? ""}`;

  return (
    <div class={style} {...props}>
      <table class="table-auto border-collapse border border-slate-400">
        {horizontal ? (
          <thead>
            <tr>
              <th class={styles.th}>Month</th>

              {monthEarnings.map((_, i) => (
                <th class={styles.th}>{months[i]}</th>
              ))}
            </tr>

            <tr>
              <th class={styles.th}>Earnings</th>

              {monthEarnings.map((earning) => (
                <td class={styles.td}>
                  <code>{earning}</code>
                </td>
              ))}
            </tr>
          </thead>
        ) : (
          <>
            <thead>
              <tr>
                <th class={styles.th}>Month</th>
                <th class={styles.th}>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {monthEarnings.map((earning, i) => (
                <tr>
                  <td class={styles.td}>{months[i]}</td>

                  <td class={styles.td}>
                    <code>{earning}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
    </div>
  );
}
