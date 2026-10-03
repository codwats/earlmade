// Defaults for every item in src/content/.
//
// The smallest valid item is a file with only `url:` in its front matter.
// It becomes a link in the inbox. Nothing is published until `status: public`.

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function kindOf(data) {
  if (data.kind) return data.kind;
  if (data.url) return "link";
  return data.title ? "post" : "note";
}

export default {
  status: "inbox",
  eleventyComputed: {
    kind: (data) => kindOf(data),
    // Links have no page of their own: they point away from the site.
    permalink: (data) => {
      if (data.status !== "public") return false;
      const kind = kindOf(data);
      if (kind === "post") return `/writing/${data.page.fileSlug}/`;
      if (kind === "note") return `/notes/${data.page.fileSlug}/`;
      return false;
    },
    layout: (data) => (kindOf(data) === "post" ? "post.njk" : "note.njk"),
    // Display name: the title if there is one, else the linked site's hostname.
    // (A computed `title` can't read the front matter `title`, so this has its own key.)
    label: (data) => data.title ?? (data.url ? hostname(data.url) : undefined),
  },
};
