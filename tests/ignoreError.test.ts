import ignoreError from "../utils/ignoreError.ts";
import { allIgnoreTypes, ignore } from "../utils/variables.ts";
import duplicatedFilesCleaner from "../duplicatedFilesCleaner.ts";
import { assertStrictEquals, assertEquals } from "std/assert/mod.ts";
import isGlobalErrorType from "../types/guards/isGlobalErrorType.ts";

function emptyIgnoreErrors() {
  for (const key of Object.keys(ignore)) delete ignore[key as keyof typeof ignore];
}

Deno.test("ignoreError", async function (t) {
  emptyIgnoreErrors();

  await t.step("Ignoring all errors for all nodes", function () {
    function assertMinutes(minutes: number | undefined) {
      for (const key of allIgnoreTypes)
        if (isGlobalErrorType(key)) assertStrictEquals(ignore[key].minutes, minutes ?? 0, key);
        else
          for (const node of duplicatedFilesCleaner.dockerIndexes) {
            assertStrictEquals(ignore[key][node]?.minutes, minutes, `${key} ${node}`);
          }
    }

    assertMinutes(undefined);

    const minutes = Math.floor(Math.random() * 100);
    ignoreError("all", minutes);

    assertMinutes(minutes);

    emptyIgnoreErrors();
  });
});

Deno.test("url test", () => {
  const url = new URL("./foo.js", "https://deno.land/");
  assertEquals(url.href, "https://deno.land/foo.js");
});
