import ignoreError from "../utils/ignoreError.ts";
import { assertStrictEquals } from "std/assert/mod.ts";
import { allIgnoreTypes, ignore } from "../utils/variables.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import isGlobalErrorType from "../types/guards/isGlobalErrorType.ts";

function emptyIgnoreErrors() {
  for (const key of Object.keys(ignore)) delete ignore[key as keyof typeof ignore];
}

Deno.test("ignoreError", async function (t) {
  emptyIgnoreErrors();

  await t.step("Ignoring all errors for all nodes", function () {
    function assertMinutes(minutes: number) {
      for (const key of allIgnoreTypes)
        if (isGlobalErrorType(key)) assertStrictEquals(ignore[key].minutes, minutes);
        else
          for (const node of duplicatedFilesCleaner.dockerIndexes)
            assertStrictEquals(ignore[key][node].minutes, minutes);
    }

    assertMinutes(0);

    const minutes = Math.floor(Math.random() * 100);
    ignoreError("all", minutes);

    assertMinutes(minutes);

    emptyIgnoreErrors();
  });
});
