// Atom feed of everything public: posts, notes and links.

const escape = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const data = {
  permalink: "/feed.xml",
  eleventyExcludeFromCollections: true,
};

export function render({ collections, site }) {
  const items = collections.items.slice(0, 50);
  const updated = items[0]?.date ?? new Date();
  const abs = (path) => new URL(path, site.url).href;

  const entries = items.map((item) => {
    const d = item.data;
    const href = d.kind === "link" ? d.url : abs(item.url);
    const id = d.kind === "link" ? `${abs("/library/")}#${item.page.fileSlug}` : href;
    const title = d.label ?? item.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    return `  <entry>
    <title>${escape(title)}</title>
    <link href="${escape(href)}"/>
    <id>${escape(id)}</id>
    <updated>${new Date(item.date).toISOString()}</updated>
    <content type="html">${escape(item.content)}</content>
  </entry>`;
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escape(site.title)}</title>
  <subtitle>${escape(site.description)}</subtitle>
  <link href="${abs("/feed.xml")}" rel="self"/>
  <link href="${abs("/")}"/>
  <id>${abs("/")}</id>
  <updated>${new Date(updated).toISOString()}</updated>
  <author><name>${escape(site.author)}</name></author>
${entries.join("\n")}
</feed>
`;
}
