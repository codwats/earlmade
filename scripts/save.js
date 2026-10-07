#!/usr/bin/env node
// Save a link or a note to the inbox from the command line.
//
//   npm run save -- https://pagefind.app "Static search for the library"
//   npm run save -- "A thought worth keeping"

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildItem, isUrl } from "../src/assets/item-file.js";
import { ogImage } from "./og-image.js";

const CONTENT_DIR = new URL("../src/content/", import.meta.url).pathname;

const [input, note = ""] = process.argv.slice(2);
if (!input) {
  console.error('Usage: npm run save -- <url or text> ["optional comment"]');
  process.exit(1);
}

// Catch duplicates before they happen: same URL already saved?
if (isUrl(input)) {
  const href = new URL(input.trim()).href;
  for (const file of readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"))) {
    const frontMatter = readFileSync(join(CONTENT_DIR, file), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const saved = frontMatter.match(/^url:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
    if (saved && URL.canParse(saved) && new URL(saved).href === href) {
      console.error(`Already saved in src/content/${file}`);
      process.exit(1);
    }
  }
}

// A thumbnail for a link, from the page's og:image. Never stops the save.
let image;
if (isUrl(input)) {
  try {
    const res = await fetch(input.trim(), { signal: AbortSignal.timeout(5000) });
    image = ogImage(await res.text(), res.url);
  } catch {}
  if (!image) console.log("No og:image found; the link will show its title instead.");
}

let { filename, markdown } = buildItem({ input, note, image });
for (let n = 2; existsSync(join(CONTENT_DIR, filename)); n++) {
  filename = filename.replace(/(-\d+)?\.md$/, `-${n}.md`);
}
writeFileSync(join(CONTENT_DIR, filename), markdown);
console.log(`Saved to the inbox: src/content/${filename}`);
