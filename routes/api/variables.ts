import State from "../../types/state.type.ts";
import * as variablesObj from "../../utils/variables.ts";
import { Handlers, RouteConfig } from "$fresh/server.ts";
import { commands } from "../../telegram/submitCommand.ts";
import { pendingNodes } from "../../incognito/submitNode.ts";
import { pendingTransactionsByAccount } from "../../incognito/submitTransaction.ts";

type SeparateVariables = "commands" | "pendingNodes" | "transactions";
export const variablesToParse: (keyof typeof variablesObj | SeparateVariables)[] = [
  "ignore",
  "commands",
  "prvToPay",
  "lastRoles",
  "onlineQueue",
  "transactions",
  "pendingNodes",
  "lastErrorTimes",
  "monthlyPayments",
  "nodesStatistics",
  "lastAccessedPages",
  "lastGlobalErrorTimes",
  "monitorInfoByDockerIndex",
];

export const config: RouteConfig = {
  routeOverride: `/api/variables/(${variablesToParse.join("|")})`,
};

export const handler: Handlers<null, State> = {
  GET(req) {
    const variable = variablesToParse.find((v) => req.url.includes(v));

    let parsed: string;
    switch (variable) {
      case undefined:
        parsed = "{}";
        break;
      case "commands":
        parsed = JSON.stringify(commands);
        break;
      case "pendingNodes":
        parsed = JSON.stringify(pendingNodes);
        break;
      case "transactions":
        parsed = JSON.stringify(pendingTransactionsByAccount);
        break;
      default:
        parsed = JSON.stringify(variablesObj[variable]);
    }

    return new Response(parsed, {
      headers: { "content-type": "application/json" },
    });
  },
};
