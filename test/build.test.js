// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { build, FIXTURE } from "./site.js";

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

test("a link entry's outbound icon has a short, accurate label", async () => {
  const { read } = await build();
  const icons = read("index.html").match(/<wa-icon name="arrow-up-right-from-square"[^>]*>/g) ?? [];
  assert.ok(icons.length > 0, "home stream shows no link entries");
  for (const icon of icons) assert.match(icon, /label="external link"/);
});

test("pages paint without waiting for the component loader, and preconnect the font host", async () => {
  const { read, outDir } = await build();
  for (const page of htmlPages(outDir)) {
    const html = read(page);
    const root = html.match(/<html\b[^>]*>/)?.[0] ?? "";
    assert.doesNotMatch(root, /\bwa-cloak\b/, `${page} cloaks the whole page`);
    assert.match(html, /<link rel="preconnect" href="https:\/\/use\.typekit\.net"/, `${page} has no font preconnect`);
  }
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

test("build warns about an item on an unknown shelf, naming the file and shelf", async () => {
  const { log } = await build();
  const warning = log.split("\n").find((line) => line.includes("[earlmade]") && line.includes(FIXTURE.shelf));
  assert.ok(warning, "no [earlmade] warning for the unknown shelf");
  assert.ok(warning.includes(FIXTURE.path), `warning doesn't name ${FIXTURE.path}: ${warning}`);
});
