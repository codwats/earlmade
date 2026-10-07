// Builds the Markdown file for a new item. Shared by /save/ (browser) and
// `npm run save` (Node), so both write files the same way.

// Where a page's thumbnail is read from, first match wins: by scripts/og-image.js
// for `npm run save`, and by the bookmarklet on /save/.
export const IMAGE_KEYS = ["og:image:secure_url", "og:image", "twitter:image"];

export const isUrl =(text) => /^https?:\/\/\S+$/i.test(text.trim());

export function slugify(text, max = 48) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/, "") || "item"
  );
}

const ymd = (date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

// input: a URL (becomes a link) or any text (becomes a note).
// note: optional comment. title, image: optional, for links.
export function buildItem({ input, note = "", title = "", image = "", date = new Date() }) {
  const text = input.trim();
  const comment = note.trim();
  const front = [];
  let body;
  let slug;

  if (isUrl(text)) {
    const url = new URL(text);
    slug = slugify(`${url.hostname.replace(/^www\./, "")} ${url.pathname}`);
    front.push(`url: ${JSON.stringify(url.href)}`);
    if (title.trim()) front.push(`title: ${JSON.stringify(title.trim())}`);
    const src = image.trim();
    if (isUrl(src) && URL.canParse(src)) front.push(`image: ${JSON.stringify(new URL(src).href)}`);
    body = comment;
  } else {
    slug = slugify(text.split(/\s+/).slice(0, 6).join(" "));
    body = [text, comment].filter(Boolean).join("\n\n");
  }
  front.push("status: inbox");

  return {
    filename: `${ymd(date)}-${slug}.md`,
    markdown: `---\n${front.join("\n")}\n---\n${body ? `${body}\n` : ""}`,
  };
}
