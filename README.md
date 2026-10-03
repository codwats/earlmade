# earlmade

A personal blog that doubles as a searchable shelf: longer posts, quick notes and saved links, all findable from one library page. Built with [Build Awesome](https://build.awesome.me/docs/) (Eleventy) and [Web Awesome](https://webawesome.com).

## Run it

Web Awesome Pro installs from a private registry, so set your token first (see `.npmrc`):

```sh
export WEBAWESOME_NPM_TOKEN=…
npm install
npm start        # dev server, plus the private /inbox/ page
npm run build    # static site in _site/
```

## Adding things

Every item is one Markdown file in `src/content/`, named `YYYY-MM-DD-slug.md` (the date comes from the filename). There are three kinds, and the kind is worked out from what's in the file:

| Kind | What it needs | Page |
| --- | --- | --- |
| **link** | `url:` | None. It points to the other site. |
| **note** | Just body text, no title | `/notes/<slug>/` |
| **post** | `title:` and a body | `/writing/<slug>/` |

Optional front matter: `title`, `description` (posts), `shelf` (one of the shelves in `src/_data/site.js`), `tags`, `updated`, `startHere: true` (lists it under "Start here" on the home page).

### Nothing is public by default

`status` decides who sees an item:

- `inbox` (the default): saved, not sorted yet. Never built.
- `private`: kept on purpose, never published.
- `public`: built and listed.

`npm start` adds an `/inbox/` page that lists everything not public yet. It is never part of `npm run build`.

### Three ways to save

- **Command line:** `npm run save -- https://example.com "why I kept it"`, or `npm run save -- "a quick thought"`. It writes an inbox file and refuses URLs you've already saved.
- **`/save/` page:** two fields. Saving opens GitHub's "new file" page with the Markdown filled in. Commit it there.
- **Bookmarklet or iOS Shortcut:** `/save/` has a bookmarklet you can drag to your bookmarks bar. A Shortcut can open `/save/?url=<shared URL>` from the share sheet.

The build also warns if the same URL is saved twice.

### Callouts in posts

```njk
{% callout "context" %}Markdown works in here.{% endcallout %}
{% callout "heads-up" %}…{% endcallout %}
{% callout "support" %}…{% endcallout %}
```

## Finding things

`/library/` lists every public item as plain HTML, so it works without JavaScript. `src/assets/library.js` adds live search, kind tabs, shelf chips with counts, the active filters, a "clear all" button and sorting. Filters are kept in the URL (`/library/?shelf=Fonts&q=mono`), so tags and shelves anywhere on the site link straight into a filtered view. Press `/` to jump to the search field.

The build also writes `/library.json` (every public item) and `/feed.xml` (Atom).

## Layout of the repo

```
src/
  content/            one Markdown file per item, plus content.11tydata.js (defaults and rules)
  _data/site.js       site name, shelves, repo for /save/
  _includes/          base.njk (wa-page shell), post.njk, note.njk, partials/entry.njk
  assets/             site.css (earlmade tokens), library.js, save.js, item-file.js
  index.njk           home: the stream
  library.njk         the library
  writing.njk         list of posts
  save.njk            owner save form
  inbox.njk           owner inbox (dev server only)
scripts/save.js       `npm run save`
woff2/                Maple Mono, served at /fonts/
```

## Still to decide

- `site.url` and `site.author` in `src/_data/site.js` (used by the feed).
- The About page copy (`src/about.md`).
- The sample items in `src/content/`: replace them with your own.
- V2 ideas: Pagefind full-text search, a ⌘K palette on `/library.json`, and automatic link import.
