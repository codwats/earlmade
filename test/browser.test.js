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

// Opens the library once its filter controls are live.
async function openLibrary(query = "") {
  const page = await open(`/library/${query}`);
  await page.locator("#library-search").waitFor();
  return page;
}

// The shelf radio group. Its radios are slotted into the group's shadow DOM, so
// they're found under the group's host element rather than its inner radiogroup.
const shelfGroup = (page) => page.locator("wa-radio-group", { has: page.getByText("Shelf", { exact: true }) });
const shelfRadio = (page, name) => shelfGroup(page).getByRole("radio", { name: new RegExp(`^${name}(\\s|$)`) });
const checkedShelf = async (page) =>
  (await shelfGroup(page).getByRole("radio", { checked: true }).textContent()).replace(/\d+/g, "").trim();
const visibleShelves = (page) =>
  page.$$eval("[data-item]", (rows) => [...new Set(rows.filter((r) => !r.hidden).map((r) => r.dataset.shelf))]);

browserTest("?shelf=Coding selects Coding in the shelf radio group and shows only Coding items", async () => {
  const page = await openLibrary("?shelf=Coding");
  try {
    assert.equal(await checkedShelf(page), "Coding");
    assert.deepEqual(await visibleShelves(page), ["Coding"]);
  } finally {
    await page.close();
  }
});

const shownCount = async (page) => Number(await page.locator("[data-shown]").textContent());
const visibleRowCount = (page) => page.$$eval("[data-item]", (rows) => rows.filter((r) => !r.hidden).length);
const shelfParam = (page) => new URL(page.url()).searchParams.get("shelf");

browserTest("choosing a shelf updates the URL and the shown count; Any shelf clears it", async () => {
  const page = await openLibrary();
  try {
    const total = await shownCount(page);
    await shelfRadio(page, "Coding").click();
    assert.equal(shelfParam(page), "Coding");
    assert.deepEqual(await visibleShelves(page), ["Coding"]);
    const shown = await shownCount(page);
    assert.ok(shown < total, `expected fewer than ${total} shown, got ${shown}`);
    assert.equal(shown, await visibleRowCount(page));

    await shelfRadio(page, "Any shelf").click();
    assert.equal(shelfParam(page), null);
    assert.equal(await shownCount(page), total);
  } finally {
    await page.close();
  }
});

browserTest("arrow keys move between shelves like any radio group", async () => {
  const page = await openLibrary();
  try {
    await shelfRadio(page, "Any shelf").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await checkedShelf(page), "Mental health");
    assert.equal(shelfParam(page), "Mental health");
  } finally {
    await page.close();
  }
});

browserTest("each shelf choice shows how many items it would give", async () => {
  const page = await openLibrary("?shelf=Design");
  try {
    const codingCount = Number((await shelfRadio(page, "Coding").textContent()).match(/\d+/)[0]);
    await shelfRadio(page, "Coding").click();
    assert.equal(await shownCount(page), codingCount);
  } finally {
    await page.close();
  }
});

browserTest("clicking a shelf tag on a row selects that shelf in the radio group", async () => {
  const page = await openLibrary();
  try {
    await page.locator("[data-shelf-link='Coding']").first().click();
    assert.equal(await checkedShelf(page), "Coding");
    assert.equal(shelfParam(page), "Coding");
    assert.deepEqual(await visibleShelves(page), ["Coding"]);
  } finally {
    await page.close();
  }
});

browserTest("Clear all resets the shelf radio group to Any shelf", async () => {
  const page = await openLibrary("?shelf=Coding&q=site");
  try {
    await page.getByRole("button", { name: "Clear all" }).click();
    assert.equal(await checkedShelf(page), "Any shelf");
    assert.equal(shelfParam(page), null);
  } finally {
    await page.close();
  }
});

browserTest("removing the shelf chip resets the shelf radio group to Any shelf", async () => {
  const page = await openLibrary("?shelf=Coding");
  try {
    await page.locator("[data-active] wa-tag").getByRole("button", { name: "Remove" }).click();
    assert.equal(await checkedShelf(page), "Any shelf");
  } finally {
    await page.close();
  }
});

browserTest("the shown count is a live region from page load and changes after a search", async () => {
  // With scripts off, the page is exactly as served: the live region must already be exposed.
  const asServed = await open("/library/", { javaScriptEnabled: false });
  try {
    const live = asServed.locator("[aria-live='polite']");
    assert.ok(await live.isVisible(), "live region is hidden on load");
    assert.match(await live.textContent(), /\d+\s+of\s+\d+ shown/);
  } finally {
    await asServed.close();
  }

  const page = await openLibrary();
  try {
    const live = page.locator("[aria-live='polite']");
    const before = (await live.textContent()).replace(/\s+/g, " ").trim();
    await page.getByRole("searchbox", { name: "Search the library" }).fill("pagefind");
    await page.waitForFunction(
      (b) => document.querySelector("[aria-live='polite']").textContent.replace(/\s+/g, " ").trim() !== b,
      before,
    );
  } finally {
    await page.close();
  }
});

browserTest("with reduced motion, a row shelf-tag click jumps to the top of the library instantly", async () => {
  const page = await open("/library/", { viewport: { width: 390, height: 400 }, reducedMotion: "reduce" });
  try {
    await page.locator("#library-search").waitFor();
    const tag = page.locator("[data-shelf-link]").last();
    await tag.scrollIntoViewIfNeeded();
    await tag.click();
    // No waiting: an instant jump has already landed; a smooth scroll would still be moving.
    const scrollNow = await page.evaluate(() => window.scrollY);
    const top = await page.evaluate(() => document.querySelector("[data-library]").getBoundingClientRect().top);
    // The filtered page may be too short to put the library flush with the top, so check it's in view.
    assert.ok(top >= -1 && top < 400, `library top is ${top}px from the viewport top`);
    // A smooth scroll caught partway would still move; an instant jump has already settled.
    await page.waitForTimeout(500);
    const scrollLater = await page.evaluate(() => window.scrollY);
    assert.equal(scrollNow, scrollLater, `scroll moved from ${scrollNow} to ${scrollLater} after the click`);
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

// If the component loader never runs (scripts off, a failed request), the first-paint
// hiding must give up after a moment, as Web Awesome's own wa-cloak does.
browserTest("with scripts off, hidden components and the page shell show up after a moment", async () => {
  const checks = [
    ["/links.html", (page) => page.locator("wa-button", { hasText: "YouTube" })],
    ["/library/", (page) => page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Writing" })],
    ["/writing/how-this-site-works/", (page) => page.getByText("Context", { exact: true })],
  ];
  for (const [path, target] of checks) {
    const page = await open(path, { javaScriptEnabled: false });
    try {
      await page.waitForTimeout(2500);
      assert.ok(await target(page).isVisible(), `${path}: still hidden with scripts off`);
    } finally {
      await page.close();
    }
  }
});

// Kind is a fixed set of four: one joined control on one line at every width.
// Shelf is a growing list: separate choices that wrap cleanly.
// When the status row wraps on a phone, Sort lines up with the content's start edge.
browserTest("library filters wrap cleanly at 390px and 1280px", async () => {
  for (const width of [390, 1280]) {
    const page = await open("/library/", { width });
    try {
      await page.locator("#library-search").waitFor();
      const boxes = (sel) =>
        page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
      const kinds = await boxes("#library-kind wa-radio");
      assert.equal(new Set(kinds.map((b) => Math.round(b.top))).size, 1, `${width}px: Kind wraps`);
      const shelves = await boxes("#library-shelf wa-radio");
      for (let i = 1; i < shelves.length; i++) {
        const [a, b] = [shelves[i - 1], shelves[i]];
        if (Math.round(a.top) === Math.round(b.top))
          assert.ok(b.left - a.right >= 4, `${width}px: shelf choices ${i - 1} and ${i} touch`);
      }
      if (width === 390) {
        const [sort] = await boxes("#library-sort");
        const [search] = await boxes("#library-search");
        assert.ok(Math.abs(sort.left - search.left) <= 1, `390px: Sort is indented by ${sort.left - search.left}px`);
      }
    } finally {
      await page.close();
    }
  }
});
