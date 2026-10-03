// /library.json: one index of every public item.
// Not used by the V1 library page (it filters the HTML rows), but it is the
// data a V2 ⌘K palette or other tools can load.

const plain = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const data = {
  permalink: "/library.json",
  eleventyExcludeFromCollections: true,
};

export function render({ collections }) {
  return JSON.stringify(
    collections.items.map((item) => {
      const d = item.data;
      return {
        kind: d.kind,
        title: d.label ?? null,
        url: d.kind === "link" ? d.url : item.url,
        date: new Date(item.date).toISOString(),
        shelf: d.shelf ?? null,
        tags: d.tags ?? [],
        text: plain(item.content),
      };
    }),
    null,
    2,
  );
}
