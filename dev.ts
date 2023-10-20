#!/usr/bin/env -S deno run -A --watch=static/,routes/

import "./crons/crons.ts";
import dev from "$fresh/dev.ts";

// Code to supress some automatic errors
const origConsoleError = console.error;
const ERRORS = Object.freeze(["Improper nesting of table", "@babel/plugin-transform-react-jsx-source"] as const);
console.error = (msg) => {
  if (typeof msg === "string" && ERRORS.some((e) => msg.includes(e))) return;
  origConsoleError(msg);
};

await dev(import.meta.url, "./main.ts");
