---
title: How this site works
description: One Markdown file per thing, three kinds of thing, and nothing public until I say so.
status: public
shelf: Coding
tags: [eleventy, indieweb]
startHere: true
---
Most of what I save is small: a font specimen, a tool, a paragraph someone wrote well. This site exists so I can find those things again without remembering where they came from.

{% callout "context" %}
This post describes the site you're reading. It's built with [Build Awesome](https://build.awesome.me/docs/) (formerly Eleventy) and [Web Awesome](https://webawesome.com) components. Replace it with your own first post whenever you like.
{% endcallout %}

## One file per thing

Every item is one Markdown file in `src/content/`. A post has a title and a body. A note is a few sentences with no title. A link is a URL, plus an optional line about why I kept it.

```md
---
url: https://pagefind.app
status: public
shelf: Coding   # optional
tags: [search]  # optional
---
Static search that runs after the build.
```

## Saving without sorting

New things land with `status: inbox`, and the build skips them. Shelves and tags can wait, or never happen. Publishing is one word: change `inbox` to `public`.

{% callout "heads-up" %}
`private` works like `inbox` but means "keep this, don't publish it". Neither is ever built.
{% endcallout %}

## Finding it again

The [library](/library/) lists everything. It filters as you type, narrows by kind, shelf or tag, shows how many items match, and has one button to clear it all. The address keeps the filters, so a filtered view can be bookmarked.
