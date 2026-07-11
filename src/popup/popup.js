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

  $("hideDev").checked = settings.hideDev;
  $("hideDev").addEventListener("change", (e) => {
    storage.setSettings({ hideDev: e.target.checked });
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

  // --- Reveal toggle: ask the content script to outline filtered items ---
  $("reveal").addEventListener("change", (e) => {
    if (!tab) return;
    // Reading lastError in the callback swallows "receiving end does not exist" on
    // pages where the content script isn't injected.
    chrome.tabs.sendMessage(
      tab.id,
      { type: "noai:reveal", on: e.target.checked },
      () => void chrome.runtime.lastError
    );
  });

  // --- Hidden log: pull the audit trail from the content script on demand ---
  const logEl = $("log");
  $("toggleLog").addEventListener("click", (e) => {
    e.preventDefault();
    if (logEl.classList.contains("show")) {
      logEl.classList.remove("show");
      return;
    }
    logEl.classList.add("show");
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { type: "noai:getLog" }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      $("count").textContent = res.count;
      logEl.innerHTML = "";
      for (const item of res.log) {
        const div = document.createElement("div");
        div.className = "logitem";
        const txt = document.createElement("div");
        txt.className = "txt";
        txt.textContent = item.text;
        const why = document.createElement("div");
        why.className = "why";
        why.textContent = item.reason;
        div.append(txt, why);
        logEl.append(div);
      }
    });
  });
}

init();
