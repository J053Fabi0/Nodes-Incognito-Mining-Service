import moment from "moment";
import moveToEnd from "./moveToEnd.ts";
import { onlineQueue } from "./variables.ts";
import { NodeStatus, allNodeRoles } from "./getNodesStatus.ts";
import { maxOnlineMinutesNotStaked, maxOnlineNodesNotStaked } from "../constants.ts";

type PartialNodeStatus = Partial<NodeStatus> & Pick<NodeStatus, "role" | "dockerIndex">;

export default function calculateOnlineQueue(nodesStatus: PartialNodeStatus[]) {
  for (const role of allNodeRoles) {
    const nodesByRole = nodesStatus.filter((ns) => ns.role === role);
    const queue = onlineQueue[role];

    // add the nodes that are in the role to the queue
    for (const node of nodesByRole) {
      const index = queue.findIndex((ns) => ns.dockerIndex === node.dockerIndex);
      if (index === -1) queue.push({ dockerIndex: node.dockerIndex, date: Date.now() });
    }

    // remove the nodes that are no longer in the same role
    for (const nodeInQueue of [...queue]) {
      const index = nodesByRole.findIndex((ns) => ns.dockerIndex === nodeInQueue.dockerIndex);
      if (index === -1) queue.splice(queue.indexOf(nodeInQueue), 1);
    }
  }

  calculateNotStakedOnlineQueue();
}

function calculateNotStakedOnlineQueue() {
  const queue = onlineQueue.NOT_STAKED;

  // set date to now for the nodes that are out of the online range
  for (let i = maxOnlineNodesNotStaked; i < queue.length; i++) queue[i].date = Date.now();

  // move to the end the nodes that are in the online range are have been there for more than maxOnlineMinutesNotStaked
  onlineQueue.NOT_STAKED = moveToEnd(
    queue,
    (node, index) =>
      index + 1 <= maxOnlineNodesNotStaked && moment().diff(node.date, "minutes") >= maxOnlineMinutesNotStaked
  );
}
