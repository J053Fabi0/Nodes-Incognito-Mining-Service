import moment from "moment";
import State from "../../types/state.type.ts";
import redirect from "../../utils/redirect.ts";
import capitalize from "../../utils/capitalize.ts";
import Typography from "../../components/Typography.tsx";
import * as variablesObj from "../../utils/variables.ts";
import { commands } from "../../telegram/submitCommand.ts";
import { pendingNodes } from "../../incognito/submitNode.ts";
import { Handlers, RouteConfig, PageProps } from "$fresh/server.ts";
import setProperty, { RecursiveObject } from "../../utils/setProperty.ts";
import { DateElements } from "../../islands/EditableObject/GetDateInput.tsx";
import EditableObject from "../../components/EditableObject/EditableObject.tsx";
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
  lastPath?: string[];
}

export const config: RouteConfig = {
  routeOverride: `/admin/edit/(${variablesToParse.join("|")})`,
};

export const handler: Handlers<EditProps, State> = {
  GET(req, ctx) {
    const url = new URL(req.url);
    const name = url.pathname.split("/").slice(-1)[0] as (typeof variablesToParse)[number];

    return ctx.render({ name, object: getVariable(name), lastPath: ctx.state.session.flash("lastPath") });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const keys = [...form.keys()];

    const url = new URL(req.url);
    const name = url.pathname.split("/").slice(-1)[0] as (typeof variablesToParse)[number];
    const obj = getVariable(name);

    // single value
    if (keys.length === 1) {
      const value = `${form.get(keys[0])}`;
      const path = keys[0].split(".");
      ctx.state.session.flash("lastPath", path);
      setProperty(path, value, obj as RecursiveObject);
    }
    // Date object
    else {
      const offset = +form.get("offset")!;
      const date = moment().utcOffset(offset);
      const path: string[] = [];

      for (const key of keys) {
        if (key === "offset") continue;

        const [element, p] = key.split("&") as [DateElements, string];
        const value = +form.get(key)!;
        switch (element) {
          case "day":
            date.date(value);
            break;
          case "month":
            date.month(value);
            break;
          case "year":
            date.year(value);
            break;
          case "hours":
            date.hour(value);
            break;
          case "minutes":
            date.minute(value);
            break;
          case "seconds":
            date.second(value);
            break;
        }

        if (path.length === 0) path.push(...p.split("."));
      }

      setProperty(path, `${date.toDate().valueOf()}`, obj as RecursiveObject);
      ctx.state.session.flash("lastPath", path);
    }

    return redirect(req.url);
  },
};

export default function Edit({ data }: PageProps<EditProps>) {
  const { name, object, lastPath } = data;
  return (
    <>
      <Typography variant="h1" class="mb-5">
        {capitalize(name)}
      </Typography>

      <EditableObject object={object} level={0} lastPath={lastPath} />
    </>
  );
}
