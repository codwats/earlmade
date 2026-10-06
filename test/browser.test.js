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

browserTest("on a wide screen a library row's tags sit together beside the main column", async () => {
  const page = await open("/library/", { width: 1440 });
  try {
    await page.getByRole("heading", { name: "The library" }).waitFor();
    await page.waitForFunction(() => customElements.get("wa-tag"));
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll("[data-item]")].map((row) => {
        const tags = [...row.querySelectorAll('a[href^="/library/?"]')].map((a) => a.getBoundingClientRect());
        const title = row.querySelector("h2, p").getBoundingClientRect();
        return { tops: tags.map((r) => Math.round(r.top)), title };
      }),
    );
    const multi = rows.filter((r) => r.tops.length > 1);
    assert.ok(multi.length > 0, "no library row has more than one tag");
    for (const { tops, title } of multi) {
      assert.equal(new Set(tops).size, 1, `tags stack across lines: ${tops}`);
      assert.ok(tops[0] < title.bottom, "tags wrapped below the main column");
    }
  } finally {
    await page.close();
  }
});

browserTest("links page has no horizontal overflow at 390px", async () => {
  const page = await open("/links.html", { width: 390 });
  try {
    await page.getByRole("heading", { name: "earlmade" }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page overflows by ${overflow}px`);
  } finally {
    await page.close();
  }
});

browserTest("links page valley is drawn in the text colour in dark mode", async () => {
  const page = await open("/links.html", { colorScheme: "dark" });
  try {
    await page.getByRole("heading", { name: "earlmade" }).waitFor();
    const { valley, surface, text } = await page.evaluate(() => ({
      valley: getComputedStyle(document.body, "::before").backgroundColor,
      surface: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
    }));
    assert.notEqual(valley, surface, "valley matches the page background");
    assert.equal(valley, text);
  } finally {
    await page.close();
  }
});
