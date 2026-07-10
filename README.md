# No-AI Content Filter

A Chrome/Edge (Manifest V3) extension that **hides AI-related content** — posts, videos,
and search results — across social feeds, YouTube, and news/search sites.

## What it does

- Scans supported pages and hides any feed item whose text mentions AI topics.
- Keeps up with infinite scroll via a throttled `MutationObserver`.
- Shows a badge count of items hidden on the current tab.
- Lets you toggle filtering globally or per-site, and edit the keyword list.

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

The matcher is pure and unit-tested (no build step, no dependencies):

```bash
node --test
```

## Configure

- **Popup** (toolbar icon): master on/off, disable on the current site, hidden count.
- **Options** (link in the popup): edit keywords (one per line), toggle sites, generic
  mode, reset to defaults.

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
