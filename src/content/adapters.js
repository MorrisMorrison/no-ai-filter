// Per-site adapters. Each knows which container element represents a single feed
// item / video / result, how to pull its text, and (optionally) which sibling
// elements must be hidden alongside it.
(function () {
  const NoAI = (globalThis.NoAI = globalThis.NoAI || {});

  const text = (el) => (el && (el.innerText || el.textContent) || "").trim();

  // Order matters only for readability; hosts are matched by suffix.
  const ADAPTERS = [
    {
      name: "twitter",
      hosts: ["x.com", "twitter.com"],
      itemSelector: 'article[data-testid="tweet"]',
      textOf: text,
    },
    {
      name: "reddit",
      hosts: ["reddit.com"],
      // Current Reddit wraps every feed card — organic AND promoted/ad — in an
      // <article>; only the inner custom element differs (shreddit-post vs
      // shreddit-ad-post). Targeting <article> catches both. shreddit-post is a
      // fallback for older shreddit; the others cover the React redesign and old.reddit.
      // (Nested matches are de-duped by the ancestor guard in content.js.)
      itemSelector:
        'article, shreddit-post, [data-testid="post-container"], .thing.link',
      textOf: text,
    },
    {
      name: "linkedin",
      hosts: ["linkedin.com"],
      itemSelector: ".feed-shared-update-v2, .fie-impression-container",
      textOf: text,
    },
    {
      name: "facebook",
      hosts: ["facebook.com"],
      // Obfuscated DOM — best effort.
      itemSelector: '[role="feed"] > div, [data-pagelet^="FeedUnit"]',
      textOf: text,
    },
    {
      name: "youtube",
      hosts: ["youtube.com"],
      itemSelector:
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer",
      textOf: text,
    },
    {
      name: "google-search",
      hosts: ["google.com"],
      // Skip news.google.com here (handled below); classic results.
      itemSelector: "div.g, div[data-hveid] > div.tF2Cxc",
      textOf: text,
      appliesTo: (host) => host === "www.google.com" || host === "google.com",
    },
    {
      name: "google-news",
      hosts: ["news.google.com"],
      itemSelector: "article",
      textOf: text,
    },
    {
      name: "hacker-news",
      hosts: ["news.ycombinator.com"],
      itemSelector: "tr.athing",
      textOf: (el) => {
        const sub = el.nextElementSibling; // subtext row (points / comments)
        return text(el) + " " + text(sub);
      },
      // A HN row is 3 <tr>s: the title, the subtext, and a spacer. Hide all three.
      related: (el) => {
        const out = [];
        const sub = el.nextElementSibling;
        if (sub) out.push(sub);
        const spacer = sub && sub.nextElementSibling;
        if (spacer && spacer.classList.contains("spacer")) out.push(spacer);
        return out;
      },
    },
  ];

  // Generic fallback (experimental) — used only when genericMode is on and no
  // specific adapter matched the host.
  const GENERIC = {
    name: "generic",
    itemSelector: "article, li, section",
    textOf: text,
  };

  function hostMatches(adapter, host) {
    if (adapter.appliesTo && !adapter.appliesTo(host)) return false;
    return adapter.hosts.some(
      (h) => host === h || host.endsWith("." + h)
    );
  }

  function forHost(host) {
    return ADAPTERS.find((a) => hostMatches(a, host)) || null;
  }

  NoAI.adapters = { forHost, GENERIC, ADAPTERS };
})();
