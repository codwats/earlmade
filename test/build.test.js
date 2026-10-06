// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { build } from "./site.js";

// Every built HTML page (Web Awesome's own files aside), relative to the output directory.
const htmlPages = (outDir) =>
  readdirSync(outDir, { recursive: true }).filter((p) => p.endsWith(".html") && !p.startsWith("webawesome"));

test("library page builds", async () => {
  const { read, log } = await build();
  assert.match(log, /Wrote \d+ files/);
  assert.match(read("library/index.html"), /<h1[^>]*>The library<\/h1>/);
});

test("About's Contact link reaches the links page, and no page links to /links/", async () => {
  const { read, outDir } = await build();
  assert.match(read("about/index.html"), /<a href="\/links\.html">Contact<\/a>/);
  for (const page of htmlPages(outDir)) {
    assert.doesNotMatch(read(page), /href="\/links\/"/, `${page} links to /links/`);
  }
});
