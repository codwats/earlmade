# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Web Awesome Pro (UI components and design tokens) with Build Awesome beta (static site generator, installed from npm as `@11ty/eleventy`). Static output with no server-side app. The domain is `earlmade.com`; the deploy host isn't decided yet.

## Users

Two audiences who matter equally:

- **The owner**, saving things worth keeping (posts, quick notes, links) and finding them again later without remembering where they came from.
- **Visitors**, who browse the same shelf, read the writing, and follow along.

Neither group buys anything or logs in.

## Product Purpose

Earlmade is a personal blog that doubles as a searchable shelf. Longer posts, short notes and saved links all sit in one stream and can be found from one library page. A visit succeeds when someone finds the thing they came for again, or chooses to follow along through the feed or the `@earlmade` socials.

## Positioning

It's a shelf first and a blog second: three kinds of item in one place, each drawn at its natural size. A note has no headline, and a link never pretends to be an article. Everything is findable again by search, kind, shelf or tag. "Earlmade" is a handle with no backstory the site needs to explain.

## Operating Context

- Every item is one Markdown file in `src/content/`. The vocabulary (item, kind, status, shelf, tag, stream, library) is defined in `CONTEXT.md`.
- Nothing is public by default. New items land in the inbox, and publishing means changing `status` to `public`.
- The owner saves through `npm run save`, the `/save/` page (which opens a prefilled GitHub "new file" page), or a bookmarklet or iOS Shortcut.
- Visitors arrive at the home stream, the library, a post, or `/links.html` from a social bio.

## Capabilities and Constraints

- Sections: home stream, library, writing, about, and a standalone links page.
- Design and dev projects are published as posts, not as a separate section.
- Shelves are a fixed list in `src/_data/site.js`. Tags are free-form.
- Feed at `/feed.xml` and a JSON index at `/library.json`.
- No commerce, accounts or comments.
- Undecided: the deploy host, the About page copy, the contact method, and V2 ideas (Pagefind full-text search, a ⌘K palette, automatic link import).

## Brand Commitments

- Public name: **earlmade**, always lowercase. It's also the feed author.
- Socials: `@earlmade` on YouTube, TikTok and Instagram.

## Evidence on Hand

- Public items in `src/content/`: saved links (Web Awesome, Build Awesome docs, Pagefind, Are.na) and one post, "How this site works". Maple Mono and a sample note are in the inbox.
- The About page is still placeholder text. There is no bio, photo, or contact detail yet. Don't invent any of them.

## Product Principles

1. **Findable again.** Every item can be reached by search, kind, shelf or tag, and the library URL keeps those filters.
2. **Draw things at their natural size.** Notes, links and posts each get the form that fits them.
3. **Low upkeep.** Adding an item means adding one file, never editing templates.
4. **Use the system, don't rebuild it.** Use a Web Awesome component whenever one exists, even where that means relying on JavaScript. Keep pages static and fast everywhere else.
5. **Show, don't pitch.** No sales language, and no claims the content can't back up.
