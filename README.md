# No-AI Content Filter

A Chrome/Edge (Manifest V3) extension that **hides AI-related content** — posts, videos,
and search results — across social feeds, YouTube, and news/search sites.

## What it does

- Scans supported pages and hides any feed item whose text mentions AI topics.
- Reads image `alt`/`aria-label` text too, so image-only promoted ads are caught.
- **Blocks whole sources** — subreddits (`r/ChatGPT`), YouTube channels (`@handle`),
  or link domains (`the-decoder.de`) — regardless of wording.
- **Strips Google's "AI Overview"** answer block (EN + German "KI-Übersicht").
- **"No-work mode"** — an extra toggle that also hides software-development content
  (its own editable keyword list, off by default), for turning a feed into pure downtime.
  It can also **fully wall off whole sites** (Hacker News by default) with a cheeky
  reminder overlay instead of filtering item-by-item.
- Keeps up with infinite scroll via a throttled `MutationObserver`.
- Shows a badge count of items hidden on the current tab, plus a **reveal toggle** and a
  **hidden-items log** in the popup so you can audit what was filtered.
- **Hide** or **blur** matches (your choice); toggle filtering globally or per-site.
- Editable keyword list with **regex support** (`/gpt-?[0-9]/i`) and German terms built in.

### Supported sites (tuned adapters)

| Area | Sites |
|------|-------|
| Social feeds | X/Twitter, Reddit, LinkedIn, Facebook |
| Video | YouTube |
| News & search | Google Search, Google News, Hacker News |

### No false positives on "AI"

Naive substring matching on `AI` would hit *email*, *again*, *chair*, *said*. Instead:

- Pure-uppercase acronyms (`AI`, `AGI`, `LLM`) match **case-sensitively** with word
  boundaries — only standalone uppercase tokens trigger.
- Multi-word phrases and brand names (`generative AI`, `ChatGPT`, `Midjourney`, …) match
  case-insensitively with word boundaries.

## Install (unpacked, for development)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Test

The matcher is pure and unit-tested (no build step, no dependencies for tests; CI runs
these on every push):

```bash
node --test
```

Optional lint/package (needs `npm install`, pulls in `web-ext`):

```bash
npm run lint     # web-ext lint
npm run build    # produces a zip in dist/ for the Chrome Web Store
```

## Configure

- **Popup** (toolbar icon): master on/off, disable on the current site, hidden count,
  reveal-filtered toggle, and the hidden-items log.
- **Options** (link in the popup): edit keywords (+ regex) and blocked sources, choose
  hide vs blur, toggle Google AI Overview stripping, per-site toggles, reset to defaults.

## Project layout

```
manifest.json
src/
  lib/       defaults.js · matcher.js · storage.js
  content/   content.js · adapters.js · hide.css
  background/service-worker.js
  options/   options.html · options.js
  popup/     popup.html · popup.js
assets/icons/
test/        matcher.test.js
```

## Notes

- Site selectors (X, Reddit, LinkedIn, Facebook especially) change often; if a site stops
  filtering, update its entry in `src/content/adapters.js`.
- Generic mode is experimental and only applies on already-supported hosts.
