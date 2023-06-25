import NodePill from "./NodePill.tsx";
import LocaleDate from "../../islands/LocaleDate.tsx";
import RelativeDate from "../../islands/RelativeDate.tsx";
import NodeEarning from "../../types/collections/nodeEarning.type.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface EarninsTableProps {
  /** Wether or not to use relative time */
  relative: boolean;
  earnings: NodeEarning[];
  /** Id as key and node number as value */
  nodes: Record<string, number>;
}

export default function EarningsTable({ relative, earnings, nodes }: EarninsTableProps) {
  return (
    <div class="overflow-x-auto">
      <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
        <thead>
          <tr>
            <th class={styles.th}>Epoch</th>
            <th class={styles.th}>Date</th>
            <th class={styles.th}>Node</th>
            <th class={styles.th}>Earning</th>
          </tr>
        </thead>
        <tbody>
          {earnings.map((e) => (
            <tr>
              <td class={styles.td}>
                <code>{e.epoch}</code>
              </td>

              <td class={styles.td}>
                {relative ? <RelativeDate date={+e.time} /> : <LocaleDate date={+e.time} />}
              </td>

              <td class={styles.td}>
                <NodePill nodeNumber={nodes[`${e.node}`]} relative={relative} />
              </td>

              <td class={styles.td}>
                <code>{e.earning}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
