const { storage } = globalThis.NoAI;
const $ = (id) => document.getElementById(id);

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch (_) {
    return "";
  }
}

async function init() {
  const [settings, tab] = await Promise.all([
    storage.getSettings(),
    activeTab(),
  ]);
  const host = hostOf(tab && tab.url);

  $("enabled").checked = settings.enabled;
  $("host").textContent = host || "this site";
  $("site").checked = !storage.isSiteDisabled(host, settings);
  $("site").disabled = !host;

  // Ask the background worker how many items were hidden on this tab.
  if (tab) {
    chrome.runtime.sendMessage({ type: "noai:getCount", tabId: tab.id }, (res) => {
      if (res) $("count").textContent = res.count;
    });
  }

  $("enabled").addEventListener("change", (e) => {
    storage.setSettings({ enabled: e.target.checked });
  });

  $("site").addEventListener("change", (e) => {
    // Drop any existing entry that matches this host, then re-add if now disabled.
    let ds = settings.disabledSites.filter((d) => !storage.matchHost(host, d));
    if (!e.target.checked) ds.push(host);
    settings.disabledSites = ds;
    storage.setSettings({ disabledSites: ds });
  });

  $("options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

init();
