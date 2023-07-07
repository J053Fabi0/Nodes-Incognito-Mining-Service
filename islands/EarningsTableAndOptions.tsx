import { useSignal } from "@preact/signals";
import NodePill from "../components/Nodes/NodePill.tsx";
import InputSwitch from "../components/InputSwitch.tsx";
import replaceURLNoReload from "../utils/replaceURLNoReload.ts";
import EarningsTable, { EarningForEarningsTable } from "./EarningsTable.tsx";

interface EarningsTableAndOptionsProps {
  nodeNumbers: number[];
  /** Defaut value for relative */
  defaultRelative: boolean;
  nodes: Record<string, number>;
  earnings: EarningForEarningsTable[];
}

export default function EarningsTableAndOptions(props: EarningsTableAndOptionsProps) {
  const { nodeNumbers, defaultRelative, earnings, nodes } = props;
  const nodesCount = nodeNumbers.length;

  const relative = useSignal<boolean>(defaultRelative);

  const handleRelativeToggle = () => {
    const url = new URL(window.location.href);
    if (relative.value) url.searchParams.delete("relative");
    else url.searchParams.append("relative", "");
    replaceURLNoReload(url.href.replace(/=+$/, ""));
    relative.value = !relative.value;
  };

  return (
    <>
      <div class="flex flex-wrap items-center gap-3 mt-1">
        {nodeNumbers.map((n, i) => (
          <NodePill
            nodeNumber={n}
            baseURL="earnings"
            relative={relative.value}
            class={i === nodesCount - 1 ? "mr-3" : ""}
          />
        ))}

        <InputSwitch
          size={20}
          color="sky"
          id="relative"
          name="relative"
          value="relative"
          label="Relative dates"
          checked={relative.value}
          onClick={handleRelativeToggle}
        />
      </div>

      <hr class="my-5" />

      <EarningsTable baseURL="earnings" earnings={earnings} nodes={nodes} relative={relative.value} />
    </>
  );
}
