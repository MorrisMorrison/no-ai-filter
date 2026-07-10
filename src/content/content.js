// Content-script entry point. Loaded after defaults/matcher/storage/adapters
// (see manifest order), so their globals are available on globalThis.NoAI.
(function () {
  const { matcher, storage, adapters } = globalThis.NoAI;
  const host = location.hostname;
  const specificAdapter = adapters.forHost(host);

  let settings = null;
  let compiled = null;
  let sessionCount = 0;

  function siteEnabled() {
    return (
      settings &&
      settings.enabled &&
      !storage.isSiteDisabled(host, settings)
    );
  }

  function activeAdapter() {
    if (specificAdapter) return specificAdapter;
    if (settings && settings.genericMode) return adapters.GENERIC;
    return null;
  }

  function hide(el, adapter) {
    el.classList.add("noai-hidden");
    if (adapter.related) {
      for (const r of adapter.related(el)) r.classList.add("noai-hidden");
    }
  }

  function process() {
    if (!siteEnabled()) return;
    const adapter = activeAdapter();
    if (!adapter) return;

    for (const el of document.querySelectorAll(adapter.itemSelector)) {
      if (el.dataset.noai) continue; // already evaluated
      // Skip anything already inside a hidden item — avoids re-processing and
      // double-counting nested matches (e.g. a <shreddit-post> within a hidden
      // <article>). querySelectorAll returns ancestors first, so it's already gone.
      if (el.closest(".noai-hidden")) {
        el.dataset.noai = "seen";
        continue;
      }
      const content = adapter.textOf(el);
      if (matcher.matches(content, compiled)) {
        hide(el, adapter);
        sessionCount++;
        el.dataset.noai = "hit";
      } else if (content && content.trim().length > 0) {
        // Only mark as permanently-evaluated once real text exists. Feeds render
        // empty tile shells first and hydrate the title a moment later — tagging an
        // empty shell "seen" would skip it forever. Leaving it untagged lets the next
        // observer pass re-check it once the title arrives.
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
    for (const el of document.querySelectorAll(".noai-hidden")) {
      el.classList.remove("noai-hidden");
    }
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
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    process();
  }

  storage.onSettingsChanged((next) => {
    settings = next;
    compiled = matcher.compile(settings.keywords);
    reset();
    process();
  });

  storage.getSettings().then((s) => {
    settings = s;
    compiled = matcher.compile(settings.keywords);
    start();
  });
})();
