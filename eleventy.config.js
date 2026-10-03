import { IdAttributePlugin } from "@11ty/eleventy";

// Every item (post, note or link) is one Markdown file in src/content/.
// Only items with `status: public` are built or listed. See CONTEXT.md.
const CONTENT_GLOB = "src/content/**/*.md";

const isPublic = (item) => item.data.status === "public";
const byNewest = (a, b) => b.date - a.date;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "node_modules/@web.awesome.me/webawesome-pro/dist-cdn": "webawesome",
    woff2: "fonts",
    "src/assets": "assets",
  });

  // Adds id="…" to headings so posts get linkable sections and a table of contents.
  eleventyConfig.addPlugin(IdAttributePlugin);

  eleventyConfig.addGlobalData("isServe", process.env.ELEVENTY_RUN_MODE === "serve");

  // --- Collections ----------------------------------------------------------

  eleventyConfig.addCollection("items", (api) => {
    const all = api.getFilteredByGlob(CONTENT_GLOB);
    // Hand-kept lists drift into duplicates; flag them at build time.
    const seen = new Map();
    for (const item of all) {
      const url = item.data.url;
      if (!url) continue;
      if (seen.has(url)) console.warn(`[earlmade] Same URL saved twice: ${seen.get(url)} and ${item.inputPath}`);
      else seen.set(url, item.inputPath);
    }
    return all.filter(isPublic).sort(byNewest);
  });

  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob(CONTENT_GLOB).filter((i) => isPublic(i) && i.data.kind === "post").sort(byNewest),
  );

  eleventyConfig.addCollection("startHere", (api) =>
    api.getFilteredByGlob(CONTENT_GLOB).filter((i) => isPublic(i) && i.data.startHere).sort(byNewest),
  );

  // Everything not public yet. Only rendered by `npm start` (see src/inbox.njk).
  eleventyConfig.addCollection("unpublished", (api) =>
    api.getFilteredByGlob(CONTENT_GLOB).filter((i) => !isPublic(i)).sort(byNewest),
  );

  // --- Filters --------------------------------------------------------------

  eleventyConfig.addFilter("readableDate", (date) => {
    const d = new Date(date);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });

  eleventyConfig.addFilter("dayHeading", (date) => {
    const d = new Date(date);
    return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  });

  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString());

  eleventyConfig.addFilter("hostname", (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  });

  // Groups a date-sorted list of items into [{ date, items }] by calendar day.
  eleventyConfig.addFilter("groupByDay", (items) => {
    const days = [];
    for (const item of items) {
      const key = new Date(item.date).toISOString().slice(0, 10);
      const last = days.at(-1);
      if (last && last.key === key) last.items.push(item);
      else days.push({ key, date: item.date, items: [item] });
    }
    return days;
  });

  // Tag counts across items, most used first: [{ tag, count }].
  eleventyConfig.addFilter("tagCounts", (items) => {
    const counts = new Map();
    for (const item of items) {
      for (const tag of item.data.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  // Table of contents from a post's <h2> headings. Layouts see the content
  // before IdAttributePlugin adds ids, so compute the same id it will add.
  eleventyConfig.addFilter("toc", function (html = "") {
    const slugify = eleventyConfig.getFilter("slugify");
    return [...html.matchAll(/<h2([^>]*)>(.*?)<\/h2>/gs)].map(([, attrs, inner]) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return { id: attrs.match(/\bid="([^"]+)"/)?.[1] ?? slugify(text), text };
    });
  });

  eleventyConfig.addFilter("readingTime", (html = "") => {
    const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
  });

  // Plain text for search indexes and feeds.
  const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
  eleventyConfig.addFilter("plainText", (html = "") =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e])
      .replace(/\s+/g, " ")
      .trim(),
  );

  // --- Shortcodes -----------------------------------------------------------

  // {% callout "context" %}…{% endcallout %} → a typed Web Awesome callout.
  const CALLOUTS = {
    context: { variant: "brand", icon: "circle-info", label: "Context" },
    "heads-up": { variant: "warning", icon: "triangle-exclamation", label: "Heads up" },
    support: { variant: "neutral", icon: "hand-holding-heart", label: "If you need support" },
  };
  // The blank lines matter: they let Markdown inside the callout render as Markdown.
  eleventyConfig.addPairedShortcode("callout", (content, type = "context", label) => {
    const c = CALLOUTS[type] ?? CALLOUTS.context;
    return [
      `<wa-callout variant="${c.variant}" class="callout">`,
      `<wa-icon slot="icon" name="${c.icon}"></wa-icon>`,
      `<strong class="callout-label">${label ?? c.label}</strong>`,
      "",
      content.trim(),
      "",
      "</wa-callout>",
    ].join("\n");
  });
}

export const config = {
  dir: { input: "src" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
};
