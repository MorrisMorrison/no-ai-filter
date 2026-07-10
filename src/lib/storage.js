// Thin wrapper over chrome.storage.sync — single source of truth for settings.
(function () {
  const NoAI = (globalThis.NoAI = globalThis.NoAI || {});
  const { DEFAULT_SETTINGS } = NoAI.defaults;
  const KEY = "noai";

  function withDefaults(obj) {
    return { ...DEFAULT_SETTINGS, ...(obj || {}) };
  }

  async function getSettings() {
    const stored = await chrome.storage.sync.get(KEY);
    return withDefaults(stored[KEY]);
  }

  // Merge a partial patch into the stored settings and persist.
  async function setSettings(patch) {
    const next = { ...(await getSettings()), ...patch };
    await chrome.storage.sync.set({ [KEY]: next });
    return next;
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
    onSettingsChanged,
    matchHost,
    isSiteDisabled,
    KEY,
  };
})();
