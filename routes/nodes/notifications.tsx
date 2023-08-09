import { ObjectId } from "mongo/mod.ts";
import { WEBSITE_URL } from "../../env.ts";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import Switch from "../../components/Switch.tsx";
import getNodeName from "../../utils/getNodeName.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import Typography from "../../components/Typography.tsx";
import { isObjectIdLike } from "../../types/guards/isObjectId.ts";
import { changeNode, changeNodes, getNodes } from "../../controllers/node.controller.ts";

const THIS_URL = `${WEBSITE_URL}/nodes/notifications`;

interface Entity {
  checked: boolean;
  label: string;
  value: string;
}

interface NotificationsProps {
  nodes: Entity[];
  isAdmin: boolean;
}

enum Checked {
  yes = "checked",
  no = "unchecked",
}

function getUserNodesQuery(isAdmin: boolean, userId: ObjectId) {
  const nodesQuery: Parameters<typeof getNodes>[0] = { inactive: { $ne: true } };
  if (!isAdmin) nodesQuery.client = userId;
  return nodesQuery;
}

export const handler: Handlers<NotificationsProps, State> = {
  async GET(_, ctx) {
    const { isAdmin } = ctx.state;
    const userId = ctx.state.userId!;

    const nodes = (
      await getNodes(getUserNodesQuery(isAdmin, ctx.state.user!._id), {
        projection: { number: 1, _id: 1, sendTo: 1, client: 1 },
      })
    ).map((n) => ({ ...n, sendTo: n.sendTo.map((c) => `${c}`) }));

    const nodeEntities: Entity[] = nodes.map((n) => ({
      checked: n.sendTo.includes(userId),
      label: `Node #${isAdmin ? getNodeName(n.client, n.number) : `${n.number}`}`,
      value: `${n._id}`,
    }));

    return ctx.render({ isAdmin, nodes: nodeEntities });
  },

  async POST(req, ctx) {
    const form = await req.formData();

    const nodeInfo = form.get("node");
    if (!nodeInfo) return redirect(THIS_URL);
    if (typeof nodeInfo !== "string") return redirect(THIS_URL);

    const [nodeId, checked] = nodeInfo.split("-") as [string, Checked];

    if (isObjectIdLike(nodeId))
      await changeNode(
        { _id: new ObjectId(nodeId) },
        { [checked === Checked.yes ? "$pull" : "$push"]: { sendTo: new ObjectId(ctx.state.user!._id) } }
      );
    else if (nodeId === "all")
      await changeNodes(getUserNodesQuery(ctx.state.isAdmin, ctx.state.user!._id), {
        [checked === Checked.yes ? "$pull" : "$push"]: { sendTo: new ObjectId(ctx.state.user!._id) },
      });

    return redirect(THIS_URL);
  },
};

export default function Notifications({ data }: PageProps<NotificationsProps>) {
  const { nodes } = data;

  const atLeastOne = nodes.some((n) => n.checked);

  return (
    <>
      <Typography variant="h1">Notifications</Typography>

      <Typography variant="h2" class="mt-4 mb-2">
        Earnings
      </Typography>

      <form method="post">
        <button value={`all-${atLeastOne ? Checked.yes : Checked.no}`} name="node">
          <Switch checked={atLeastOne} label="All node-earnings notifications" />
        </button>

        <hr class="my-4" />

        <div class="flex flex-col gap-3 mt-3">
          {nodes.map((n) => (
            <button value={`${n.value}-${n.checked ? Checked.yes : Checked.no}`} name="node">
              <Switch checked={n.checked} label={n.label} />
            </button>
          ))}
        </div>
      </form>
    </>
  );
}
