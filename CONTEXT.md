# Context

Glossary for earlmade. Use these words in code, issues and docs.

- **Item**: one Markdown file in `src/content/`. Everything on the site is an item.
- **Kind**: what an item is. One of `post`, `note`, `link`. Worked out from the front matter if not set: a `url` makes a link, a `title` makes a post, otherwise a note.
- **Post**: a titled piece of writing with its own page under `/writing/`.
- **Note**: a few sentences with no title. Has a page under `/notes/`, but is shown in full in the stream.
- **Link**: a saved URL with an optional comment. Has no page of its own.
- **Image**: optional thumbnail URL for a link (`image:` in the front matter), read from the page's og:image when it's saved. Can also be a file next to the item (`image: ./2026-10-07-example-com.jpg`). The build serves its own copy. A link with no image shows its label tiled diagonally instead.
- **Status**: who sees an item. `inbox` (the default; saved but not sorted yet), `private` (kept, never published) or `public`. Only public items are built.
- **Inbox**: all items that aren't public. Visible at `/inbox/` while running `npm start`.
- **Shelf**: an optional, single topic for an item, from a fixed list in `src/_data/site.js` (for example Fonts, Mental health). Not "category".
- **Tag**: optional, free-form, any number per item.
- **Stream**: the home page's newest-first list of items, grouped by day.
- **Library**: `/library/`, the one page for finding any public item by search, kind, shelf or tag.
- **Start here**: items marked `startHere: true`, listed on the home page.
