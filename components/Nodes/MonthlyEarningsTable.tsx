import dayjs from "dayjs/mod.ts";
import nameOfMonth from "../../utils/nameOfMonth.ts";

interface MonthlyEarningsProps {
  monthEarnings: string[];
  horizontal?: boolean;
}

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

export default function MonthlyEarningsTable({ monthEarnings, horizontal }: MonthlyEarningsProps) {
  const months = Array.from({ length: monthEarnings.length })
    .map((_, i) =>
      dayjs()
        .subtract(i + 1, "month")
        .toDate()
    )
    .map((m) => nameOfMonth(m));

  return (
    <div class="overflow-x-auto">
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

                  <td class={styles.th}>
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
