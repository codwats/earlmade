// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "./site.js";

test("library page builds", async () => {
  const { read, log } = await build();
  assert.match(log, /Wrote \d+ files/);
  assert.match(read("library/index.html"), /<h1[^>]*>The library<\/h1>/);
});

test("every shelf used by a public item has a filter on the home page", async () => {
  const { read } = await build();
  const filters = read("index.html").match(/<nav[^>]*aria-label="Shelves"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  const used = new Set(JSON.parse(read("library.json")).map((item) => item.shelf).filter(Boolean));
  assert.ok(used.size > 0);
  for (const shelf of used) {
    assert.ok(filters.includes(`href="/library/?shelf=${encodeURIComponent(shelf)}"`), `no home-page filter for shelf "${shelf}"`);
  }
});
