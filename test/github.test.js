// Run with:  node --test
const { test } = require("node:test");
const assert = require("node:assert");
const gh = require("../src/lib/github.js");

const ORGS = ["acme-corp", "Acme-Labs"]; // mixed case on purpose

test("pageWorkOrg flags a work org's page and repos", () => {
  for (const p of [
    "/acme-corp",
    "/acme-corp/secret-repo",
    "/acme-corp/secret-repo/issues/42",
    "/orgs/acme-corp/people",
    "/ACME-CORP/Thing", // case-insensitive
  ]) {
    assert.equal(gh.pageWorkOrg(p, ORGS), "acme-corp", `should flag: ${p}`);
  }
  assert.equal(gh.pageWorkOrg("/acme-labs/x", ORGS), "acme-labs", "second org too");
});

test("pageWorkOrg ignores non-work owners and reserved routes", () => {
  for (const p of [
    "/torvalds/linux", // someone else's repo
    "/",               // dashboard
    "/search",         // route
    "/settings/profile",
    "/notifications",
    "/orgs", // bare route
  ]) {
    assert.equal(gh.pageWorkOrg(p, ORGS), null, `should NOT flag: ${p}`);
  }
});

test("pageWorkOrg with no configured orgs never blocks", () => {
  assert.equal(gh.pageWorkOrg("/acme-corp/repo", []), null);
});

test("titleOwner matches only repo/org root links, not deep links", () => {
  assert.equal(gh.titleOwner("/acme-corp"), "acme-corp");
  assert.equal(gh.titleOwner("/acme-corp/repo"), "acme-corp");
  assert.equal(gh.titleOwner("/acme-corp/repo?tab=readme"), "acme-corp");
  // deep links must NOT resolve (else we'd hide a tiny nested element)
  assert.equal(gh.titleOwner("/acme-corp/repo/stargazers"), null);
  assert.equal(gh.titleOwner("/acme-corp/repo/issues"), null);
  // routes excluded
  assert.equal(gh.titleOwner("/search"), null);
});
