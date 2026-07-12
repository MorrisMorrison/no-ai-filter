// Pure GitHub URL parsing for No-work mode. Kept side-effect-free so it can be
// unit-tested in Node (see test/github.test.js) and reused by the content script.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.NoAI = root.NoAI || {};
    root.NoAI.github = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Top-level GitHub paths that are routes, not repo/org owners.
  const RESERVED = new Set([
    "orgs", "dashboard", "search", "notifications", "settings", "marketplace",
    "explore", "topics", "trending", "sponsors", "features", "pulls", "issues",
    "codespaces", "new", "login", "logout", "join", "about", "pricing", "contact",
    "apps", "collections", "events", "stars", "watching", "account", "organizations",
    "users", "site", "security", "home", "customer-stories", "readme",
  ]);

  const norm = (orgs) => (orgs || []).map((o) => String(o).trim().toLowerCase()).filter(Boolean);

  // Owner of a repo/org ROOT link only ("/owner" or "/owner/repo") — NOT deep links
  // like "/owner/repo/stargazers". Returns null for routes and non-root links.
  function titleOwner(href) {
    const path = (href || "").split(/[?#]/)[0];
    const m = /^\/([^/]+)(?:\/([^/]+))?\/?$/.exec(path);
    if (!m) return null;
    const owner = m[1].toLowerCase();
    return RESERVED.has(owner) ? null : owner;
  }

  // If pathname points at a work org's page or one of its repos, return that org.
  // Handles "/org", "/org/repo", "/org/repo/…", and "/orgs/org/…".
  function pageWorkOrg(pathname, orgs) {
    const list = norm(orgs);
    if (!list.length) return null;
    const segs = (pathname || "").split("/").filter(Boolean);
    if (!segs.length) return null;
    const owner = (segs[0] === "orgs" && segs[1] ? segs[1] : segs[0]).toLowerCase();
    if (RESERVED.has(owner)) return null;
    return list.includes(owner) ? owner : null;
  }

  return { RESERVED, titleOwner, pageWorkOrg, norm };
});
