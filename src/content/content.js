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
  const hiddenLog = []; // { text, reason } — audit trail shown in the popup

  function siteEnabled() {
    return settings && settings.enabled && !storage.isSiteDisabled(host, settings);
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
    if (!siteEnabled()) return;
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
    compiled = matcher.compile(settings.keywords);
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
