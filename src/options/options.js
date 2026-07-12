const { defaults, storage, adapters } = globalThis.NoAI;
const $ = (id) => document.getElementById(id);

// Each supported site is represented by its primary host.
const SITES = adapters.ADAPTERS.map((a) => ({ name: a.name, host: a.hosts[0] }));
const MANAGED_HOSTS = SITES.map((s) => s.host);

function renderSites(settings) {
  $("sites").innerHTML = "";
  for (const site of SITES) {
    const wrap = document.createElement("label");
    wrap.className = "site";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.host = site.host;
    cb.checked = !storage.isSiteDisabled(site.host, settings);
    wrap.append(cb, document.createTextNode(site.host));
    $("sites").append(wrap);
  }
}

function load(settings) {
  $("keywords").value = settings.keywords.join("\n");
  $("devKeywords").value = (settings.devKeywords || []).join("\n");
  $("noworkSites").value = (settings.noWorkBlockSites || []).join("\n");
  $("hideDev").checked = settings.hideDev;
  $("sources").value = (settings.blockedSources || []).join("\n");
  $("generic").checked = settings.genericMode;
  $("aioverview").checked = settings.hideGoogleAiOverview;
  const action = settings.action === "blur" ? "blur" : "hide";
  document.querySelector(`input[name="action"][value="${action}"]`).checked = true;
  renderSites(settings);
}

function linesOf(id) {
  return $(id)
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function init() {
  const settings = await storage.getSettings();
  load(settings);

  $("save").addEventListener("click", async () => {
    // Preserve any per-site disables the options page doesn't manage (e.g. added via
    // the popup on an unsupported host), then apply the checkbox states.
    let disabledSites = settings.disabledSites.filter(
      (d) => !MANAGED_HOSTS.some((m) => storage.matchHost(m, d))
    );
    for (const cb of document.querySelectorAll("#sites input")) {
      if (!cb.checked) disabledSites.push(cb.dataset.host);
    }

    await storage.setSettings({
      keywords: linesOf("keywords"),
      devKeywords: linesOf("devKeywords"),
      noWorkBlockSites: linesOf("noworkSites"),
      hideDev: $("hideDev").checked,
      blockedSources: linesOf("sources"),
      disabledSites,
      genericMode: $("generic").checked,
      hideGoogleAiOverview: $("aioverview").checked,
      action: document.querySelector('input[name="action"]:checked').value,
    });
    flashSaved();
  });

  $("reset").addEventListener("click", async () => {
    const next = await storage.setSettings({ ...defaults.DEFAULT_SETTINGS });
    load(next);
    flashSaved();
  });
}

function flashSaved() {
  const el = $("saved");
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1500);
}

init();
