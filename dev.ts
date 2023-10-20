#!/usr/bin/env -S deno run -A --watch=static/,routes/

import "./crons/crons.ts";
import dev from "$fresh/dev.ts";

// Code to supress the error "Improper nesting of table"
const origConsoleError = console.error;
console.error = (msg) => {
  if (typeof msg === "string" && msg.includes("Improper nesting of table")) return;
  origConsoleError(msg);
};

await dev(import.meta.url, "./main.ts");
