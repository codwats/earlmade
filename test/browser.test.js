// Browser tests: the built site in system Chromium via playwright-core.
// Skipped with a message when no browser is found (see CHROMIUM_PATH in site.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { browser, NO_BROWSER } from "./site.js";

const env = await browser();
const browserTest = (name, fn) => test(name, { skip: !env && NO_BROWSER }, fn);

// Opens a built page in a fresh tab; the caller closes it.
async function open(path, { width = 1280, ...options } = {}) {
  const page = await env.browser.newPage({ viewport: { width, height: 800 }, ...options });
  await page.goto(env.baseURL + path);
  return page;
}

browserTest("library page loads at 390px with no horizontal overflow", async () => {
  const page = await open("/library/", { width: 390 });
  try {
    await page.getByRole("heading", { name: "The library" }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
  } finally {
    await page.close();
  }
});
