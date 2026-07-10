// Default settings & keyword list.
// UMD-ish: works as a CommonJS module (for tests) and as a browser global.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.NoAI = root.NoAI || {};
    root.NoAI.defaults = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Conservative by design — broaden it in the options page once you see how it behaves.
  // Pure-uppercase entries (AI, AGI, LLM) are matched case-SENSITIVELY with word
  // boundaries so "email", "again", "chair", "said" never trigger. Everything else
  // is matched case-insensitively. See matcher.js.
  const DEFAULT_KEYWORDS = [
    "artificial intelligence",
    "AI",
    "AGI",
    "LLM",
    "large language model",
    "generative AI",
    "genai",
    "AI-generated",
    "AI-powered",
    "AI slop",
    "ChatGPT",
    "GPT-4",
    "GPT-5",
    "OpenAI",
    "Anthropic",
    "Claude",
    "Gemini",
    "Copilot",
    "Midjourney",
    "Stable Diffusion",
    "DALL·E",
    "Sora",
    "prompt engineering",
    "neural network",
    "machine learning",
  ];

  const DEFAULT_SETTINGS = {
    enabled: true,
    keywords: DEFAULT_KEYWORDS,
    // Hostnames where the user has turned filtering off (per-site toggle in the popup).
    disabledSites: [],
    // Experimental: apply a best-effort generic adapter on supported hosts where no
    // specific adapter matched. Off by default (more false positives).
    genericMode: false,
  };

  return { DEFAULT_KEYWORDS, DEFAULT_SETTINGS };
});
