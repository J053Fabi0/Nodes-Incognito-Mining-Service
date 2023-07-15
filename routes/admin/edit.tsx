import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import capitalize from "../../utils/capitalize.ts";
import * as variablesObj from "../../utils/variables.ts";
import Typography from "../../components/Typography.tsx";
import { commands } from "../../telegram/submitCommand.ts";
import { pendingNodes } from "../../incognito/submitNode.ts";
import EditableObject from "../../components/EditableObject.tsx";
import { Handlers, RouteConfig, PageProps } from "$fresh/server.ts";
import setProperty, { RecursiveObject } from "../../utils/setProperty.ts";
import { pendingTransactionsByAccount } from "../../incognito/submitTransaction.ts";

type SeparateVariables = "commands" | "pendingNodes" | "transactions";
export const variablesToParse: (keyof typeof variablesObj | SeparateVariables)[] = [
  "ignore",
  "commands",
  "prvToPay",
  "lastRoles",
  "syncedNodes",
  "transactions",
  "pendingNodes",
  "lastErrorTimes",
  "monthlyPayments",
  "nodesStatistics",
  "lastGlobalErrorTimes",
];

function getVariable(name: (typeof variablesToParse)[number]) {
  switch (name) {
    case "commands":
      return commands;
    case "pendingNodes":
      return pendingNodes;
    case "transactions":
      return pendingTransactionsByAccount;
    default:
      return variablesObj[name];
  }
}

interface EditProps {
  // deno-lint-ignore no-explicit-any
  object: any;
  name: string;
}

export const config: RouteConfig = {
  routeOverride: `/admin/edit/(${variablesToParse.join("|")})`,
};

export const handler: Handlers<EditProps, State> = {
  GET(req, ctx) {
    const url = new URL(req.url);
    const name = url.pathname.split("/").slice(-1)[0] as (typeof variablesToParse)[number];

    return ctx.render({ name, object: getVariable(name) });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const path = form.keys().next().value.split(".");
    const value = `${form.get(path.join("."))}`;

    const url = new URL(req.url);
    const name = url.pathname.split("/").slice(-1)[0] as (typeof variablesToParse)[number];
    const obj = getVariable(name);

    setProperty(path, value, obj as RecursiveObject);

    return redirect(req.url);
  },
};

export default function Edit({ data }: PageProps<EditProps>) {
  const { name, object } = data;
  return (
    <>
      <Typography variant="h1" class="mb-5">
        {capitalize(name)}
      </Typography>

      <EditableObject object={object} level={0} />
    </>
  );
}
