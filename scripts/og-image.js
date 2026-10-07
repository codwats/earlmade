// Reads a page's thumbnail from its HTML: the first IMAGE_KEYS meta (as
// `property` or `name`), resolved against the page URL.
import { IMAGE_KEYS } from "../src/assets/item-file.js";

export function ogImage(html, pageUrl) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)].map(([, key, ...v]) => [
        key.toLowerCase(),
        (v.find((x) => x !== undefined) ?? "").replace(/&amp;/g, "&").trim(),
      ]),
    ),
  );
  for (const key of IMAGE_KEYS) {
    const meta = metas.find((m) => m.content && [m.property, m.name].some((k) => k?.toLowerCase() === key));
    if (meta && URL.canParse(meta.content, pageUrl)) return new URL(meta.content, pageUrl).href;
  }
}
