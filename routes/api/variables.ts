import State from "../../types/state.type.ts";
import * as variablesObj from "../../utils/variables.ts";
import { Handlers, RouteConfig } from "$fresh/server.ts";

export const variablesToParse: (keyof typeof variablesObj)[] = [
  "ignore",
  "prvToPay",
  "lastRoles",
  "syncedNodes",
  "lastErrorTimes",
  "nodesStatistics",
  "lastGlobalErrorTimes",
];

export const config: RouteConfig = {
  routeOverride: `/api/variables/(${variablesToParse.join("|")})`,
};

export const handler: Handlers<null, State> = {
  GET(req) {
    const variable = variablesToParse.find((v) => req.url.includes(v));
    return new Response(variable ? JSON.stringify(variablesObj[variable]) : "{}", {
      headers: { "content-type": "application/json" },
    });
  },
};
