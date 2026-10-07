// Build-output tests: assertions against the generated site and the build log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { build, buildWith, FALLBACK_LABEL, FIXTURE, IMAGE_HOST } from "./site.js";
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

// --- Images ----------------------------------------------------------------

test("an image next to a post renders as a lazy <picture> with AVIF and WebP and a fixed size", async () => {
  const { read } = await build();
  const picture = read("writing/__test-image-post/index.html").match(/<picture>[\s\S]*?<\/picture>/)?.[0];
  assert.ok(picture, "no <picture> in the post");
  assert.match(picture, /<source type="image\/avif"/);
  assert.match(picture, /<source type="image\/webp"/);
  const img = picture.match(/<img [^>]*>/)[0];
  assert.match(img, /alt="A test image"/);
  assert.match(img, /loading="lazy"/);
  assert.match(img, /width="\d+"/);
  assert.match(img, /height="\d+"/);
});

test("an image with no alt text fails the build", async () => {
  await assert.rejects(
    buildWith({
      "./src/content/__test-no-alt.md": "---\ntitle: No alt\nstatus: public\n---\n![](./__test-no-alt.png)\n",
      "./src/content/__test-no-alt.png": readFileSync(new URL("../src/apple-touch-icon.png", import.meta.url)),
    }),
    (err) => /Image with no alt text in \S*__test-no-alt\.md: \.\/__test-no-alt\.png/.test(err.stdout + err.stderr),
  );
});

test("images from items that aren't public stay out of the build", async () => {
  const { outDir } = await build();
  const leaked = readdirSync(outDir, { recursive: true }).filter((f) => f.includes("__test-private"));
  assert.deepEqual(leaked, []);
});

// One fixture link's card in the home stream.
const card = (html, title) =>
  html.split("<article ").find((a) => a.includes(`>${title}<wa-icon`)) ?? assert.fail(`no card for ${title}`);

test("a link's image: is downloaded and served from the site, with empty alt", async () => {
  const { read } = await build();
  const html = card(read("index.html"), "Test thumbnail link");
  const thumb = html.match(/<img [^>]*>/)?.[0];
  assert.ok(thumb, "no thumbnail on the card");
  assert.match(thumb, /alt=""/);
  assert.match(thumb, /width="\d+"/);
  assert.match(thumb, /height="\d+"/);
  assert.doesNotMatch(html, new RegExp(IMAGE_HOST));
  const src = thumb.match(/src="(\/[^"]+)"/)?.[1];
  assert.ok(src, `thumbnail isn't served from the site: ${thumb}`);
  assert.ok(read(src.slice(1)), `${src} isn't in the build`);
});

// A local image: is a file next to the item, wherever the card is drawn.
test("a link's image: can be a file next to the item, on the home stream and in the library", async () => {
  const { read } = await build();
  const home = card(read("index.html"), "Test local thumbnail");
  const row = read("library/index.html").split("<li ").find((r) => r.includes(">Test local thumbnail</a>"));
  for (const [where, html] of [["home", home], ["library", row]]) {
    const thumb = html?.match(/<div class="entry-thumb">\s*(?:<picture>[\s\S]*?)?(<img [^>]*>)/)?.[1];
    assert.ok(thumb, `${where}: no thumbnail`);
    const src = thumb.match(/src="(\/[^"]+)"/)?.[1];
    assert.ok(src, `${where}: the local file wasn't found: ${thumb}`);
    assert.ok(read(src.slice(1)), `${where}: ${src} isn't in the build`);
  }
});

test("a broken image: doesn't fail the build or hot-link the dead host, and keeps the slot's size", async () => {
  const { read } = await build();
  const html = card(read("index.html"), "Test broken thumbnail");
  assert.doesNotMatch(html, new RegExp(IMAGE_HOST));
  const img = html.match(/<img [^>]*>/)?.[0] ?? "";
  if (img) assert.match(img, /width="\d+" height="\d+"/);
});

test("two links with the same slug on different dates get different pattern ids", async () => {
  const { read } = await build();
  const home = read("index.html");
  const id = (title) => card(home, title).match(/<pattern id="([^"]+)"/)?.[1];
  assert.ok(id("Test same slug one"));
  assert.notEqual(id("Test same slug one"), id("Test same slug two"));
});

test("library link rows show the same thumbnail as the home stream", async () => {
  const { read } = await build();
  const rows = read("library/index.html").split("<li ").filter((r) => r.includes('data-kind="link"'));
  const row = (title) => rows.find((r) => r.includes(`>${title}</a>`)) ?? assert.fail(`no row for ${title}`);
  assert.match(row("Test thumbnail link"), /<div class="entry-thumb">\s*<(img|picture)[^>]*>/);
  assert.match(row(FALLBACK_LABEL), new RegExp(`<svg aria-hidden="true"[\\s\\S]*<text[^>]*>${FALLBACK_LABEL}</text>`));
  const ids = [...read("library/index.html").matchAll(/<pattern id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, `pattern ids repeat: ${ids}`);
});

test("a link with no image: shows its label in an inline, hidden SVG with a unique pattern", async () => {
  const { read } = await build();
  const home = read("index.html");
  const svg = card(home, FALLBACK_LABEL).match(/<svg [\s\S]*?<\/svg>/)?.[0];
  assert.ok(svg, "no fallback SVG on the card");
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, new RegExp(`<text[^>]*>${FALLBACK_LABEL}</text>`));
  const ids = [...home.matchAll(/<pattern id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length > 1, "the home page shows fewer than two fallbacks");
  assert.equal(new Set(ids).size, ids.length, `pattern ids repeat: ${ids}`);
});
