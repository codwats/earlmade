// Saving: the Markdown file buildItem writes, and the og:image the CLI reads from a page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildItem } from "../src/assets/item-file.js";
import { ogImage } from "../scripts/og-image.js";

const date = new Date(2026, 9, 6);

test("a link with an http(s) image writes image: after title: and before status:", () => {
  const { markdown } = buildItem({ input: "https://example.com/a", title: "A", image: "https://example.com/card.png", date });
  assert.equal(markdown, '---\nurl: "https://example.com/a"\ntitle: "A"\nimage: "https://example.com/card.png"\nstatus: inbox\n---\n');
});

test("a note ignores image", () => {
  const { markdown } = buildItem({ input: "A thought", image: "https://example.com/card.png", date });
  assert.equal(markdown, "---\nstatus: inbox\n---\nA thought\n");
});

test("a javascript: or other non-http image is ignored", () => {
  for (const image of ["javascript:alert(1)", "data:image/png;base64,AAAA", "/img/card.png", "not a url"]) {
    const { markdown } = buildItem({ input: "https://example.com/a", image, date });
    assert.equal(markdown, '---\nurl: "https://example.com/a"\nstatus: inbox\n---\n', image);
  }
});

test("omitting image writes the same file as before", () => {
  assert.deepEqual(buildItem({ input: "https://example.com/a", note: "why", date }), {
    filename: "2026-10-06-example-com-a.md",
    markdown: '---\nurl: "https://example.com/a"\nstatus: inbox\n---\nwhy\n',
  });
});

const page = "https://example.com/posts/one";

test("og:image prefers secure_url, then og:image, then twitter:image", () => {
  const twitter = '<meta name="twitter:image" content="https://example.com/t.png">';
  const og = '<meta property="og:image" content="https://example.com/o.png">';
  const secure = '<meta property="og:image:secure_url" content="https://example.com/s.png">';
  assert.equal(ogImage(twitter + og + secure, page), "https://example.com/s.png");
  assert.equal(ogImage(twitter + og, page), "https://example.com/o.png");
  assert.equal(ogImage(twitter, page), "https://example.com/t.png");
});

test("og:image is read from property or name, in any attribute order and quoting", () => {
  assert.equal(ogImage(`<meta name="og:image" content="https://example.com/n.png">`, page), "https://example.com/n.png");
  assert.equal(ogImage(`<META content='https://example.com/q.png?a=1&amp;b=2' property='og:image' />`, page), "https://example.com/q.png?a=1&b=2");
});

test("a relative og:image is resolved against the page URL", () => {
  assert.equal(ogImage('<meta property="og:image" content="/img/card.png">', page), "https://example.com/img/card.png");
  assert.equal(ogImage('<meta property="og:image" content="card.png">', page), "https://example.com/posts/card.png");
});

test("no og:image gives undefined", () => {
  assert.equal(ogImage('<meta property="og:title" content="Hi"><meta property="og:image" content="">', page), undefined);
  assert.equal(ogImage("", page), undefined);
});
