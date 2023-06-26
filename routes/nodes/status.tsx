import { ObjectId } from "mongo";
import State from "../../types/state.type.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import NodePill from "../../components/Nodes/NodePill.tsx";
import { getNodes } from "../../controllers/node.controller.ts";
import sortNodes, { NodeInfoByDockerIndex, NodesStatusByDockerIndex } from "../../utils/sortNodes.ts";

const styles = {
  th: "border border-slate-300 py-2 px-3",
  td: "border border-slate-300 py-2 px-3 text-center",
};

interface NodesStatusProps {
  nodesInfo: NodeInfoByDockerIndex[];
  nodesStatus: NodesStatusByDockerIndex;
}

export const handler: Handlers<NodesStatusProps, State> = {
  async GET(_, ctx) {
    const nodes = await getNodes(
      { _id: new ObjectId(ctx.state.userId!) },
      { projection: { dockerIndex: 1, _id: 0 } }
    );

    const { nodesInfoByDockerIndex: nodesInfo, nodesStatusByDockerIndex: nodesStatus } = await sortNodes(
      nodes.map((n) => n.dockerIndex)
    );

    return ctx.render({ nodesInfo, nodesStatus });
  },
};

export default function NodesStatus({ data }: PageProps<NodesStatusProps>) {
  const { nodesInfo, nodesStatus } = data;
  return (
    <div class="overflow-x-auto">
      <table class="table-auto border-collapse border border-slate-400 mb-5 w-full">
        <thead>
          <tr>
            <th class={styles.th}>Node</th>
            <th class={styles.th}>Docker</th>
            <th class={styles.th}>Online</th>
            <th class={styles.th}>Sync state</th>
            <th class={styles.th}>Role</th>
            <th class={styles.th}>Shard</th>
          </tr>
        </thead>
        <tbody>
          {nodesInfo.map(([node, { docker, beacon, shard: _, ...info }]) => {
            const status = nodesStatus[node];
            return (
              <tr>
                <td class={styles.td}>
                  <NodePill baseURL={null} nodeNumber={+node} relative={false} />
                </td>

                <td class={styles.td}>
                  <code>{docker.running ? "🟢 Running" : "🔴 Stopped"}</code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
