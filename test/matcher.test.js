// Run with:  node --test
// Highest-value check: the matcher must catch AI content without false positives.
const { test } = require("node:test");
const assert = require("node:assert");
const matcher = require("../src/lib/matcher.js");
const { DEFAULT_KEYWORDS } = require("../src/lib/defaults.js");

const compiled = matcher.compile(DEFAULT_KEYWORDS);
const hit = (s) => matcher.matches(s, compiled);

test("matches obvious AI content", () => {
  for (const s of [
    "the new AI model is wild",
    "ChatGPT launches a new feature",
    "this is generative AI at its finest",
    "a deep dive into large language models",
    "OpenAI and Anthropic race ahead",
    "made with Midjourney",
    "GPT-4 vs GPT-5 benchmarks",
    "AI-generated artwork",
    "Is AGI near?",
    "running an LLM locally",
  ]) {
    assert.ok(hit(s), `expected MATCH: ${s}`);
  }
});

test("does NOT match ordinary text containing a-i letters", () => {
  for (const s of [
    "email me again about the chair",
    "she said the mail is on the table",
    "maintain the main domain",
    "a brilliant sunrise over the bay",
    "the aircraft gained altitude", // "ai" inside words, lowercase
    "I need a haircut and a coffee",
  ]) {
    assert.ok(!hit(s), `expected NO match: ${s}`);
  }
});

test("acronyms match only as standalone uppercase tokens", () => {
  assert.ok(hit("the AI wins"), "standalone uppercase AI should match");
  assert.ok(!hit("email"), "AI inside 'email' should not match");
  assert.ok(!hit("CHAIR"), "AI inside an all-caps word should not match");
});

test("empty / falsy input is safe", () => {
  assert.ok(!hit(""));
  assert.ok(!hit(null));
  assert.ok(!hit(undefined));
});

test("compile handles empty keyword list", () => {
  const c = matcher.compile([]);
  assert.ok(!matcher.matches("anything about AI", c));
});
