// Content-script entry point. Loaded after defaults/matcher/storage/adapters
// (see manifest order), so their globals are available on globalThis.NoAI.
(function () {
  const { matcher, storage, adapters, util } = globalThis.NoAI;
  const host = location.hostname;
  const specificAdapter = adapters.forHost(host);

  let settings = null;
  let compiled = null;
  let blockedSources = [];
  let sessionCount = 0;
  let dismissedPath = null; // path the user peeked past; re-arms when the path changes
  const hiddenLog = []; // { text, reason } — audit trail shown in the popup

  // Friendly names + rotating reminders for the full-page No-work block.
  const SITE_NAMES = { "news.ycombinator.com": "Hacker News" };
  const NOWORK_MESSAGES = [
    "This is a no-work zone. {name} can wait. 🙅",
    "You told me to keep you off {name}. You're welcome. 🍊",
    "Nope — no-work mode is on. Go touch grass. 🌱",
    "{name} during your break? Bold move. Close the tab.",
    "The internet will survive without your hot take. Step away. ⏰",
    "Reading {name} is just work cosplay. Take the break you scheduled.",
    "Breathe. Stretch. Anything but {name}. 🧘",
  ];

  function siteEnabled() {
    return settings && settings.enabled && !storage.isSiteDisabled(host, settings);
  }

  function siteName(h) {
    const bare = h.replace(/^www\./, "");
    return SITE_NAMES[bare] || bare;
  }

  // Should this whole host be walled off right now?
  function noWorkBlocked() {
    if (!(siteEnabled() && settings.hideDev)) return false;
    return (settings.noWorkBlockSites || []).some((d) => {
      d = String(d).trim().toLowerCase();
      return d && (host === d || host.endsWith("." + d));
    });
  }

  function renderBlock(nameOverride) {
    if (dismissedPath === location.pathname) return;
    if (document.getElementById("noai-nowork-block")) return;
    const name = nameOverride || siteName(host);
    const msg = NOWORK_MESSAGES[Math.floor(Math.random() * NOWORK_MESSAGES.length)].replace(
      /{name}/g,
      name
    );
    const overlay = document.createElement("div");
    overlay.id = "noai-nowork-block";

    const card = document.createElement("div");
    card.className = "noai-block-card";

    const emoji = document.createElement("div");
    emoji.className = "noai-block-emoji";
    emoji.textContent = "🚫";

    const h1 = document.createElement("div");
    h1.className = "noai-block-msg";
    h1.textContent = msg; // textContent — never inject markup

    const sub = document.createElement("div");
    sub.className = "noai-block-sub";
    sub.textContent = "No-work mode is on.";

    const dismiss = document.createElement("a");
    dismiss.className = "noai-block-dismiss";
    dismiss.href = "#";
    dismiss.textContent = "…fine, let me peek";
    dismiss.addEventListener("click", (e) => {
      e.preventDefault();
      dismissedPath = location.pathname;
      removeBlock();
    });

    card.append(emoji, h1, sub, dismiss);
    overlay.append(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  function removeBlock() {
    const el = document.getElementById("noai-nowork-block");
    if (el) el.remove();
  }

  // --- GitHub work-org handling (No-work mode) ---------------------------------
  const gh = globalThis.NoAI.github;
  const isGitHub = () => host === "github.com" || host === "www.github.com";
  const githubOrgs = () => gh.norm(settings.noWorkGitHubOrgs);

  // The full list-item/row for a repo link. GitHub's result cards use hashed class
  // names, so climb to a stable structural anchor instead (results-list child, <ul>
  // item, or the profile repo list), falling back to the nearest li/article/.Box-row.
  function githubResultContainer(a) {
    let el = a;
    for (let i = 0; i < 10 && el && el.parentElement; i++) {
      const p = el.parentElement;
      if (p.getAttribute && p.getAttribute("data-testid") === "results-list") return el;
      if (p.id === "user-repositories-list") return el;
      if (p.tagName === "UL" || p.tagName === "OL") return el;
      el = p;
    }
    return a.closest("li, article, .Box-row, .feed-item");
  }

  // Hide list entries (dashboard feed, search, repo lists) that belong to a work org.
  function filterGitHubList() {
    const orgs = githubOrgs();
    if (!orgs.length) return;
    for (const a of document.querySelectorAll('a[href^="/"]')) {
      const owner = gh.titleOwner(a.getAttribute("href"));
      if (!owner || !orgs.includes(owner)) continue;
      const container = githubResultContainer(a);
      if (!container || container.dataset.noai) continue;
      if (container.closest(".noai-filtered")) continue;
      hide(container, {}, container.textContent, "work repo: " + owner);
    }
  }

  function processGitHub() {
    if (!(settings.hideDev && githubOrgs().length)) {
      removeBlock();
      return;
    }
    const workOrg = gh.pageWorkOrg(location.pathname, settings.noWorkGitHubOrgs);
    if (workOrg) {
      renderBlock(workOrg);
      return;
    }
    removeBlock();
    filterGitHubList();
    report();
  }

  function activeAdapter() {
    if (specificAdapter) return specificAdapter;
    if (settings && settings.genericMode) return adapters.GENERIC;
    return null;
  }

  // Does this item come from a blocked subreddit / channel / link domain?
  // Returns the offending source string, or null.
  function matchSource(el, adapter) {
    if (!blockedSources.length) return null;
    let srcs;
    try {
      srcs = adapter.sourcesOf ? adapter.sourcesOf(el) : util.linkDomains(el);
    } catch (_) {
      return null;
    }
    for (const s of srcs || []) {
      const sl = String(s).toLowerCase();
      for (const b of blockedSources) if (sl.includes(b)) return s;
    }
    return null;
  }

  function applyFilter(el) {
    el.classList.add("noai-filtered");
    el.classList.add(settings.action === "blur" ? "noai-blurred" : "noai-hidden");
  }

  function hide(el, adapter, content, reason) {
    applyFilter(el);
    if (adapter.related) {
      for (const r of adapter.related(el)) applyFilter(r);
    }
    const snippet =
      (content || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0] || "(no visible text)";
    hiddenLog.push({ text: snippet.slice(0, 120), reason });
    if (hiddenLog.length > 300) hiddenLog.shift();
    sessionCount++;
    el.dataset.noai = "hit";
  }

  function process() {
    if (!siteEnabled()) {
      removeBlock();
      return;
    }
    // No-work mode can wall off a whole site instead of filtering item-by-item.
    if (noWorkBlocked()) {
      renderBlock();
      return;
    }
    // GitHub gets work-org-aware handling (block work repos/orgs, hide them in lists).
    if (isGitHub()) {
      processGitHub();
      return;
    }
    removeBlock();
    const adapter = activeAdapter();
    if (!adapter) return;

    // Google's injected AI Overview block isn't a normal result item — purge it separately.
    if (settings.hideGoogleAiOverview && adapter.aiOverview) {
      for (const el of adapter.aiOverview(document)) {
        if (!el || el.dataset.noai) continue;
        hide(el, adapter, adapter.textOf(el), "Google AI Overview");
      }
    }

    for (const el of document.querySelectorAll(adapter.itemSelector)) {
      if (el.dataset.noai) continue; // already evaluated
      // Skip anything already inside a filtered item — avoids re-processing and
      // double-counting nested matches (e.g. a <shreddit-post> within a hidden <article>).
      if (el.closest(".noai-filtered")) {
        el.dataset.noai = "seen";
        continue;
      }
      const content = adapter.textOf(el);
      const kw = matcher.firstMatch(content, compiled);
      let reason = kw ? 'keyword "' + kw + '"' : null;
      if (!reason) {
        const src = matchSource(el, adapter);
        if (src) reason = "source: " + src;
      }
      if (reason) {
        hide(el, adapter, content, reason);
      } else if (content && content.trim().length > 0) {
        // Only mark permanently-evaluated once real text exists. Feeds render empty tile
        // shells first and hydrate the title later; tagging an empty shell "seen" would
        // skip it forever. Leaving it untagged lets the next pass re-check it.
        el.dataset.noai = "seen";
      }
    }
    report();
  }

  // Clear all traces so the page can be re-evaluated from scratch (keyword edit,
  // toggle on/off). Cheap relative to a reload and avoids stale hides.
  function reset() {
    for (const el of document.querySelectorAll("[data-noai]")) {
      delete el.dataset.noai;
    }
    for (const el of document.querySelectorAll(".noai-filtered")) {
      el.classList.remove("noai-filtered", "noai-hidden", "noai-blurred");
    }
    hiddenLog.length = 0;
    sessionCount = 0;
    // Re-arm the No-work wall — toggling settings should bring it back even if peeked past.
    dismissedPath = null;
    removeBlock();
  }

  function report() {
    try {
      chrome.runtime.sendMessage({ type: "noai:count", count: sessionCount });
    } catch (_) {
      // Extension context can be invalidated on reload; ignore.
    }
  }

  // Feeds lazy-load on scroll — coalesce mutation bursts into one pass every ~200ms.
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      process();
    }, 200);
  }

  function start() {
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    process();
  }

  function applySettings(next) {
    settings = next;
    // "No-work mode" layers dev keywords on top of the AI list when enabled.
    const words = settings.hideDev
      ? [...settings.keywords, ...(settings.devKeywords || [])]
      : settings.keywords;
    compiled = matcher.compile(words);
    blockedSources = (settings.blockedSources || [])
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean);
  }

  // Popup ↔ content messages (tab-targeted; distinct from the background worker's).
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "noai:reveal") {
      document.documentElement.classList.toggle("noai-show-hidden", !!msg.on);
      return;
    }
    if (msg.type === "noai:getLog") {
      sendResponse({ log: hiddenLog.slice(-100).reverse(), count: sessionCount });
      return true;
    }
  });

  storage.onSettingsChanged((next) => {
    applySettings(next);
    reset();
    process();
  });

  storage.getSettings().then((s) => {
    applySettings(s);
    start();
  });
})();
