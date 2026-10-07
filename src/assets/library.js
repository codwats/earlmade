// Live search and filters for /library/.
// Works on the rows already in the page; the URL keeps the state (?q=&kind=&shelf=&tag=).

const root = document.querySelector("[data-library]");

if (root) {
  const rows = [...root.querySelectorAll("[data-item]")];
  const list = root.querySelector("[data-rows]");
  const search = root.querySelector("#library-search");
  const kindGroup = root.querySelector("#library-kind");
  const sortSelect = root.querySelector("#library-sort");
  const shelfGroup = root.querySelector("#library-shelf");
  const shownEl = root.querySelector("[data-shown]");
  const activeEl = root.querySelector("[data-active]");
  const clearBtn = root.querySelector("[data-clear]");
  const emptyEl = root.querySelector("[data-empty]");

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") ?? "",
    kind: params.get("kind") ?? "all",
    shelf: params.get("shelf") ?? "",
    tag: params.get("tag") ?? "",
    sort: params.get("sort") ?? "new",
  };

  const words = () => state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matchQ = (row, ws) => ws.every((w) => row.dataset.text.includes(w));
  const matchKind = (row, kind) => kind === "all" || row.dataset.kind === kind;
  const matchShelf = (row, shelf) => !shelf || row.dataset.shelf === shelf;
  const matchTag = (row) => !state.tag || row.dataset.tags.split(" ").includes(state.tag);

  const kindLabels = { post: "Posts", note: "Notes", link: "Links" };

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q.trim()) p.set("q", state.q.trim());
    if (state.kind !== "all") p.set("kind", state.kind);
    if (state.shelf) p.set("shelf", state.shelf);
    if (state.tag) p.set("tag", state.tag);
    if (state.sort !== "new") p.set("sort", state.sort);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function chip(label, onRemove) {
    const tag = document.createElement("wa-tag");
    tag.size = "s";
    tag.withRemove = true;
    tag.textContent = label;
    tag.addEventListener("wa-remove", onRemove);
    return tag;
  }

  function sortRows() {
    const sorted = [...rows].sort((a, b) => {
      if (state.sort === "az") return a.dataset.title.localeCompare(b.dataset.title);
      if (state.sort === "old") return a.dataset.date.localeCompare(b.dataset.date);
      return b.dataset.date.localeCompare(a.dataset.date);
    });
    list.append(...sorted);
  }

  function render() {
    const ws = words();
    let shown = 0;
    for (const row of rows) {
      const visible = matchQ(row, ws) && matchKind(row, state.kind) && matchShelf(row, state.shelf) && matchTag(row);
      row.hidden = !visible;
      if (visible) shown++;
    }

    // Counts show what each choice would give you with the other filters kept.
    const count = (attr, key, matchOthers, matchChoice) => {
      for (const el of root.querySelectorAll(`[${attr}]`)) {
        const choice = el.dataset[key];
        el.textContent = rows.filter((r) => matchQ(r, ws) && matchTag(r) && matchOthers(r) && matchChoice(r, choice)).length;
      }
    };
    count("data-kind-count", "kindCount", (r) => matchShelf(r, state.shelf), matchKind);
    count("data-shelf-count", "shelfCount", (r) => matchKind(r, state.kind), matchShelf);

    activeEl.replaceChildren();
    if (state.q.trim()) activeEl.append(chip(`“${state.q.trim()}”`, () => update({ q: "" }, true)));
    if (state.kind !== "all") activeEl.append(chip(kindLabels[state.kind], () => update({ kind: "all" })));
    if (state.shelf) activeEl.append(chip(state.shelf, () => update({ shelf: "" })));
    if (state.tag) activeEl.append(chip(`#${state.tag}`, () => update({ tag: "" })));

    shownEl.textContent = shown;
    clearBtn.hidden = activeEl.children.length === 0;
    emptyEl.hidden = shown > 0;
    syncUrl();
  }

  function update(changes, resetSearchField = false) {
    Object.assign(state, changes);
    if (resetSearchField) search.value = state.q;
    if ("kind" in changes) kindGroup.value = state.kind;
    if ("shelf" in changes) shelfGroup.value = state.shelf;
    if ("sort" in changes) sortRows();
    render();
  }

  const clearAll = () => update({ q: "", kind: "all", shelf: "", tag: "" }, true);

  search.addEventListener("input", () => update({ q: search.value }));
  search.addEventListener("wa-clear", () => update({ q: "" }));
  kindGroup.addEventListener("change", () => update({ kind: kindGroup.value }));
  sortSelect.addEventListener("change", () => update({ sort: sortSelect.value }));
  shelfGroup.addEventListener("change", () => update({ shelf: shelfGroup.value }));
  clearBtn.addEventListener("click", clearAll);
  root.querySelector("[data-clear-empty]").addEventListener("click", clearAll);

  // Tags and shelves on a row filter in place instead of reloading the page.
  list.addEventListener("click", (event) => {
    const tagLink = event.target.closest("[data-tag-link]");
    const shelfLink = event.target.closest("[data-shelf-link]");
    if (!tagLink && !shelfLink) return;
    event.preventDefault();
    if (tagLink) update({ tag: tagLink.dataset.tagLink });
    else update({ shelf: shelfLink.dataset.shelfLink });
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  // "/" jumps to the search field from anywhere on the page.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const t = event.target;
    if (t.closest?.("input, textarea, select, [contenteditable], wa-input, wa-textarea")) return;
    event.preventDefault();
    search.focus();
  });

  for (const el of root.querySelectorAll("[data-js-only]")) el.hidden = false;
  search.value = state.q;
  kindGroup.value = state.kind;
  shelfGroup.value = state.shelf;
  sortSelect.value = state.sort;
  if (state.sort !== "new") sortRows();
  render();
}
