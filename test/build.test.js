// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "./site.js";
import site from "../src/_data/site.js";

test("library page builds", async () => {
  const { read, log } = await build();
  assert.match(log, /Wrote \d+ files/);
  assert.match(read("library/index.html"), /<h1[^>]*>The library<\/h1>/);
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
