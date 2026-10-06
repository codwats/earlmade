// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "./site.js";

test("library page builds", async () => {
  const { read, log } = await build();
  assert.match(log, /Wrote \d+ files/);
  assert.match(read("library/index.html"), /<h1[^>]*>The library<\/h1>/);
});
