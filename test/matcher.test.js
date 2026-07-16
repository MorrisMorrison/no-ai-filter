// Run with:  node --test
// Highest-value check: the matcher must catch AI content without false positives.
const { test } = require("node:test");
const assert = require("node:assert");
const matcher = require("../src/lib/matcher.js");
const { DEFAULT_KEYWORDS, DEFAULT_DEV_KEYWORDS } = require("../src/lib/defaults.js");

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
    // regression cases from real feed screenshots:
    "Wer auf proprietäre KI-Modelle setzt, riskiert alles", // German "AI models"
    "I found what's missing in agentic development",
    "Meet IBM Bob. An AI coding agent for real workflows",
    "Mistral-Gründer über Künstliche Intelligenz",
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
    "Kinder spielen mit der Kiste im Park", // German: "KI" only as capitalized-word start, not standalone
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

test("supports raw /regex/ keyword entries", () => {
  const c = matcher.compile(["/gpt-?[0-9]/i"]);
  assert.ok(matcher.matches("the GPT4 release", c));
  assert.ok(matcher.matches("gpt-5 is out", c));
  assert.ok(!matcher.matches("a plain sentence", c));
});

test("an invalid regex entry is ignored, not fatal", () => {
  const c = matcher.compile(["/([unclosed/", "ChatGPT"]);
  assert.ok(matcher.matches("ChatGPT news", c), "valid entries still work");
  assert.ok(!matcher.matches("nothing here", c));
});

test("no-work mode: dev keywords catch dev content", () => {
  const c = matcher.compile(DEFAULT_DEV_KEYWORDS);
  for (const s of [
    "learning Python for data science",
    "opened a pull request on GitHub",
    "our REST API returns JSON",
    "debugging a nasty stack trace",
    "he just landed a software engineer role",
    "deploying with Docker and Kubernetes",
    // regression cases from real YouTube screenshots:
    'Jr Devs - "I Can\'t Code Anymore"', // via "dev(s)"
    "Terry Davis – Die schwerste Frage in der Programmierung", // German
    "The Java Story | Official Trailer | Full Film Coming July 17th",
  ]) {
    assert.ok(matcher.matches(s, c), `expected MATCH: ${s}`);
  }
});

test("no-work mode: excluded ambiguous words don't false-positive", () => {
  const c = matcher.compile(DEFAULT_DEV_KEYWORDS);
  for (const s of [
    "fans react to the shocking news",
    "let's go to the beach this weekend",
    "rust spots on the old car",
    "a bug flew into the room",
    "the waiter was a great server",
    "just a quick coffee break",
    "the device won't charge", // "dev" must not match inside "device"
    "Die Entwicklung der Stadt geht voran", // German city development ≠ Entwickler
  ]) {
    assert.ok(!matcher.matches(s, c), `expected NO match: ${s}`);
  }
});

test("firstMatch returns the matched keyword for logging", () => {
  const c = matcher.compile(DEFAULT_KEYWORDS);
  assert.equal(matcher.firstMatch("all about ChatGPT today", c), "ChatGPT");
  assert.equal(matcher.firstMatch("nothing relevant", c), null);
});
