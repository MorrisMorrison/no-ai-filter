// Keyword compilation + text-match engine — the brains of the filter.
// Pure & side-effect-free so it can be unit-tested in Node (see test/matcher.test.js).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.NoAI = root.NoAI || {};
    root.NoAI.matcher = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // A keyword that is purely uppercase letters (AI, AGI, LLM) is ambiguous when
  // lowercased ("email", "again", "mail") — so we match it case-sensitively.
  function isAcronym(kw) {
    return /^[A-Z]{2,5}$/.test(kw);
  }

  // Wrap with \b only where the keyword's edge is a word character, so phrases like
  // "DALL·E" or "GPT-4" still anchor correctly on their alphanumeric ends. The trailing
  // "s?" lets a plural through ("model" → "models", "LLM" → "LLMs") while the boundary
  // still blocks unrelated suffixes ("Sora" won't match "Soraya").
  function pattern(kw) {
    const left = /^\w/.test(kw) ? "\\b" : "";
    const right = /\w$/.test(kw) ? "s?\\b" : "";
    return left + escapeRegExp(kw) + right;
  }

  function build(list, flags) {
    if (!list.length) return null;
    return new RegExp(list.map(pattern).join("|"), flags);
  }

  // Compile a keyword array into a pair of regexes: one case-sensitive (acronyms),
  // one case-insensitive (everything else). Returns { cs, ci }.
  function compile(keywords) {
    const cs = [];
    const ci = [];
    for (const raw of keywords || []) {
      const kw = String(raw).trim();
      if (!kw) continue;
      (isAcronym(kw) ? cs : ci).push(kw);
    }
    return { cs: build(cs, ""), ci: build(ci, "i") };
  }

  // Does the text contain any keyword? Uses .test() with non-global regexes (no
  // lastIndex statefulness), so it's safe to call repeatedly on the same compiled object.
  function matches(text, compiled) {
    if (!text || !compiled) return false;
    if (compiled.cs && compiled.cs.test(text)) return true;
    if (compiled.ci && compiled.ci.test(text)) return true;
    return false;
  }

  return { compile, matches, escapeRegExp, pattern, isAcronym };
});
