// /save/: turns the two fields into a Markdown file and opens GitHub's
// "new file" page with it filled in. Reads ?url=&title=&note= so the
// bookmarklet and the share-sheet Shortcut can prefill it.

import { buildItem } from "./item-file.js";

const root = document.querySelector("[data-save]");

if (root) {
  const form = root.querySelector("[data-save-form]");
  const input = form.querySelector('[name="input"]');
  const note = form.querySelector('[name="note"]');
  const pathEl = root.querySelector("[data-path]");
  const fileEl = root.querySelector("[data-file]");
  const params = new URLSearchParams(location.search);
  let title = params.get("title") ?? "";

  const current = () => buildItem({ input: input.value ?? "", note: note.value ?? "", title });

  function preview() {
    const { filename, markdown } = current();
    pathEl.textContent = `src/content/${filename}`;
    fileEl.textContent = markdown;
  }

  function save() {
    if (!(input.value ?? "").trim()) {
      input.focus();
      return;
    }
    const { filename, markdown } = current();
    const url = new URL(`https://github.com/${root.dataset.repo}/new/${root.dataset.branch}`);
    url.searchParams.set("filename", `src/content/${filename}`);
    url.searchParams.set("value", markdown);
    window.open(url, "_blank", "noopener");
  }

  input.value = params.get("url") ?? params.get("text") ?? "";
  note.value = params.get("note") ?? "";
  input.addEventListener("input", () => {
    title = ""; // a title from the bookmarklet belongs to the original URL only
    preview();
  });
  note.addEventListener("input", preview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save();
  });
  form.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      save();
    }
  });

  const bookmarklet = root.querySelector("[data-bookmarklet]");
  bookmarklet.href =
    `javascript:location.href='${location.origin}/save/?url='+encodeURIComponent(location.href)` +
    `+'&title='+encodeURIComponent(document.title)`;

  preview();
}
