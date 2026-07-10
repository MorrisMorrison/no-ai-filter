// Per-site adapters. Each knows which container element represents a single feed
// item / video / result, how to pull its text, where its "source" identifiers
// (subreddit / channel / link domains) live, and any siblings to hide alongside it.
(function () {
  const NoAI = (globalThis.NoAI = globalThis.NoAI || {});

  // Text used for keyword matching. Includes image alt-text and aria-labels so
  // image-only ads (e.g. a promoted card whose headline is baked into the image)
  // are still caught.
  function richText(el) {
    if (!el) return "";
    let base = el.innerText || el.textContent || "";
    const extras = [];
    el.querySelectorAll("img[alt], [aria-label]").forEach((n) => {
      const a = n.getAttribute("alt") || n.getAttribute("aria-label");
      if (a) extras.push(a);
    });
    return (base + " " + extras.join(" ")).trim();
  }

  // External link domains inside an item (for domain-based source blocking).
  function linkDomains(el) {
    const here = location.hostname.replace(/^www\./, "");
    const out = new Set();
    el.querySelectorAll("a[href]").forEach((a) => {
      try {
        const host = new URL(a.href, location.href).hostname.replace(/^www\./, "");
        if (host && host !== here && !host.endsWith("." + here)) out.add(host);
      } catch (_) {}
    });
    return [...out];
  }

  const text = richText;

  // Order matters only for readability; hosts are matched by suffix.
  const ADAPTERS = [
    {
      name: "twitter",
      hosts: ["x.com", "twitter.com"],
      itemSelector: 'article[data-testid="tweet"]',
      textOf: text,
      sourcesOf: (el) => {
        const s = new Set(linkDomains(el));
        el.querySelectorAll('a[href^="/"][role="link"]').forEach((a) => {
          const m = a.getAttribute("href").match(/^\/([A-Za-z0-9_]+)$/);
          if (m) s.add("@" + m[1]);
        });
        return [...s];
      },
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
        'article, shreddit-post, shreddit-ad-post, [data-testid="post-container"], .thing.link, .thing.promoted',
      textOf: text,
      sourcesOf: (el) => {
        const s = new Set(linkDomains(el));
        // shreddit web components expose these as attributes — the reliable source.
        const post = el.matches && el.matches("shreddit-post, shreddit-ad-post")
          ? el
          : el.querySelector("shreddit-post, shreddit-ad-post");
        if (post) {
          const sub = post.getAttribute("subreddit-prefixed-name");
          const author = post.getAttribute("author");
          if (sub) s.add(sub);
          if (author) s.add("u/" + author.replace(/^u\//, ""));
        }
        // Fallback for React / old reddit: parse /r/ and /user/ links.
        el.querySelectorAll('a[href*="/r/"]').forEach((a) => {
          const m = a.getAttribute("href").match(/\/r\/([A-Za-z0-9_]+)/);
          if (m) s.add("r/" + m[1]);
        });
        el.querySelectorAll('a[href*="/user/"], a[href^="/u/"]').forEach((a) => {
          const m = a.getAttribute("href").match(/\/u(?:ser)?\/([A-Za-z0-9_-]+)/);
          if (m) s.add("u/" + m[1]);
        });
        return [...s];
      },
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
      // Home grid = ytd-rich-item-renderer; search = ytd-video-renderer; sidebar =
      // ytd-compact-video-renderer; plus reels, shorts, the newer lockup view-model,
      // and in-feed ad slots.
      itemSelector:
        "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer, ytd-rich-grid-slim-media, yt-lockup-view-model, ytd-ad-slot-renderer",
      textOf: text,
      sourcesOf: (el) => {
        const s = new Set(linkDomains(el));
        el.querySelectorAll(
          'ytd-channel-name a, a[href^="/@"], a[href^="/channel/"], a[href^="/c/"]'
        ).forEach((a) => {
          const name = (a.textContent || "").trim();
          if (name) s.add(name);
          const m = (a.getAttribute("href") || "").match(/\/@([^/?]+)/);
          if (m) s.add("@" + m[1]);
        });
        return [...s];
      },
    },
    {
      name: "google-search",
      hosts: ["google.com"],
      // Skip news.google.com here (handled below); classic results.
      itemSelector: "div.g, div[data-hveid] > div.tF2Cxc",
      textOf: text,
      appliesTo: (host) => host === "www.google.com" || host === "google.com",
      // Google's injected "AI Overview" answer block. Selectors rot fast, so we combine
      // known containers with a heading-text heuristic (EN + DE). Best-effort — update
      // when Google reshuffles the DOM.
      aiOverview: (root) => {
        const els = new Set();
        root
          .querySelectorAll('div[data-subtree="aio"], #m-x-content, div[data-al-attr="aio"]')
          .forEach((e) => els.add(e));
        const label = /^(ai overview|ki-übersicht|ki-zusammenfassung|übersicht mit ki|mit ki erstellt)/i;
        root
          .querySelectorAll('h1, h2, [role="heading"], div[aria-level]')
          .forEach((h) => {
            if (!label.test((h.textContent || "").trim())) return;
            let c = h;
            for (let i = 0; i < 6 && c.parentElement; i++) {
              c = c.parentElement;
              if (c.offsetHeight > 120) break;
            }
            els.add(c);
          });
        return [...els];
      },
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
        return richText(el) + " " + richText(sub);
      },
      sourcesOf: (el) => {
        const s = new Set();
        el.querySelectorAll('span.sitestr').forEach((n) => {
          const t = (n.textContent || "").trim();
          if (t) s.add(t);
        });
        return [...s, ...linkDomains(el)];
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
    return adapter.hosts.some((h) => host === h || host.endsWith("." + h));
  }

  function forHost(host) {
    return ADAPTERS.find((a) => hostMatches(a, host)) || null;
  }

  NoAI.util = { richText, linkDomains };
  NoAI.adapters = { forHost, GENERIC, ADAPTERS };
})();
