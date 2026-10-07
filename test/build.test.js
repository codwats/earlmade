// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { build, FIXTURE } from "./site.js";
import site from "../src/_data/site.js";

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

test("every shelf used by a public item has an option in the library shelf radio group", async () => {
  const { read } = await build();
  const group = read("library/index.html").match(/<wa-radio-group id="library-shelf"[\s\S]*?<\/wa-radio-group>/)?.[0] ?? "";
  const options = new Set([...group.matchAll(/<wa-radio [^>]*value="([^"]*)"/g)].map((m) => m[1]));
  const used = new Set(JSON.parse(read("library.json")).map((item) => item.shelf).filter(Boolean));
  assert.ok(used.size > 0);
  for (const shelf of used) {
    assert.ok(options.has(shelf), `no library shelf option for "${shelf}"`);
  }
});

test("build warns about an item on an unknown shelf, naming the file and shelf", async () => {
  const { log } = await build();
  const warning = log.split("\n").find((line) => line.includes("[earlmade]") && line.includes(FIXTURE.shelf));
  assert.ok(warning, "no [earlmade] warning for the unknown shelf");
  assert.ok(warning.includes(FIXTURE.path), `warning doesn't name ${FIXTURE.path}: ${warning}`);
});

test("library shelf filter is a radio group with Any shelf first, then every shelf", async () => {
  const { read } = await build();
  const html = read("library/index.html");
  const group = html.match(/<wa-radio-group id="library-shelf"[\s\S]*?<\/wa-radio-group>/);
  assert.ok(group, "no shelf radio group on the library page");
  assert.match(group[0], /<span slot="label" class="wa-visually-hidden">Shelf<\/span>/);
  const values = [...group[0].matchAll(/<wa-radio appearance="button" value="([^"]*)">([^<]*)/g)].map((m) => [m[1], m[2].trim()]);
  assert.deepEqual(values[0], ["", "Any shelf"]);
  assert.deepEqual(values.slice(1), site.shelves.map((shelf) => [shelf, shelf]));
});

test("library page has no aria-pressed anywhere", async () => {
  const { read } = await build();
  assert.doesNotMatch(read("library/index.html"), /aria-pressed/);
});
