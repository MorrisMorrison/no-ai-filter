// Thin wrapper over chrome.storage.sync — single source of truth for settings.
(function () {
  const NoAI = (globalThis.NoAI = globalThis.NoAI || {});
  const { DEFAULT_SETTINGS } = NoAI.defaults;
  const KEY = "noai";

  function withDefaults(obj) {
    return { ...DEFAULT_SETTINGS, ...(obj || {}) };
  }

  async function getRaw() {
    const stored = await chrome.storage.sync.get(KEY);
    return stored[KEY] || {};
  }

  async function getSettings() {
    return withDefaults(await getRaw());
  }

  // Merge a partial patch into the RAW stored deltas and persist. Only fields the user
  // actually changed live in storage — everything else falls through to the live
  // DEFAULT_SETTINGS, so shipped updates to the default keyword lists reach users who
  // never customized them. A patch value of `undefined` removes the stored override.
  async function setSettings(patch) {
    const next = { ...(await getRaw()), ...patch };
    for (const k of Object.keys(next)) {
      if (next[k] === undefined) delete next[k];
    }
    await chrome.storage.sync.set({ [KEY]: next });
    return withDefaults(next);
  }

  // Drop ALL stored overrides — settings fall back to live defaults.
  async function resetSettings() {
    await chrome.storage.sync.remove(KEY);
    return withDefaults({});
  }

  // Host matching that tolerates www./subdomain differences in both directions, so a
  // per-site toggle set as "youtube.com" also covers "www.youtube.com" and vice-versa.
  function matchHost(a, b) {
    return a === b || a.endsWith("." + b) || b.endsWith("." + a);
  }

  function isSiteDisabled(host, settings) {
    return (settings.disabledSites || []).some((d) => matchHost(host, d));
  }

  // Subscribe to live changes (used by the content script to react without a reload).
  function onSettingsChanged(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes[KEY]) {
        cb(withDefaults(changes[KEY].newValue));
      }
    });
  }

  NoAI.storage = {
    getSettings,
    setSettings,
    resetSettings,
    onSettingsChanged,
    matchHost,
    isSiteDisabled,
    KEY,
  };
})();
