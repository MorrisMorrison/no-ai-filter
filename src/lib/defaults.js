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
    // Core / English
    "artificial intelligence",
    "AI",
    "AGI",
    "LLM",
    "GPT",
    "large language model",
    "generative AI",
    "genai",
    "AI-generated",
    "AI-powered",
    "AI model",
    "AI agent",
    "AI coding",
    "AI tool",
    "AI slop",
    "agentic",
    "coding agent",
    "chatbot",
    "prompt engineering",
    "neural network",
    "machine learning",
    "deep learning",
    "diffusion model",
    // German (user's feeds are often German — "KI" = Künstliche Intelligenz)
    "KI",
    "Künstliche Intelligenz",
    "Sprachmodell",
    // Products / vendors
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
    "Mistral",
    "Grok",
    "Perplexity",
    "Hugging Face",
    "DeepSeek",
    "Qwen",
  ];

  // "No-work mode" — software-development keywords, applied ONLY when hideDev is on.
  // Curated toward high-signal, low-ambiguity terms: bare everyday-word collisions
  // (React/Swift/Go/Rust/Java/code/bug/server/query/terminal) are deliberately left out
  // so you can add them yourself if you want it more aggressive. Uppercase acronyms
  // (API, SQL, CSS…) match case-sensitively, same trick as the AI list.
  const DEFAULT_DEV_KEYWORDS = [
    // concepts / roles / workflow
    "software development",
    "software engineer",
    "software engineering",
    "web development",
    "app development",
    "programming language",
    "programming",
    "programmer",
    "coding",
    "source code",
    "codebase",
    "open source",
    "developer",
    "DevOps",
    "backend",
    "frontend",
    "full-stack",
    "compiler",
    "algorithm",
    "data structure",
    "design pattern",
    "framework",
    "microservices",
    "serverless",
    "kubernetes",
    "docker",
    "webpack",
    "pull request",
    "merge request",
    "code review",
    "stack trace",
    "Stack Overflow",
    "debugging",
    "refactoring",
    "unit test",
    "continuous integration",
    "CI/CD",
    "REST API",
    "GraphQL",
    "webhook",
    "endpoint",
    "database",
    "deployment",
    "command line",
    "shell script",
    "git",
    "git commit",
    "GitHub",
    "GitLab",
    "Bitbucket",
    "VS Code",
    "Visual Studio",
    "LeetCode",
    // languages / frameworks (unambiguous ones only)
    "JavaScript",
    "TypeScript",
    "Python",
    "Golang",
    "Kotlin",
    "PostgreSQL",
    "MongoDB",
    "Django",
    "Node.js",
    "Angular",
    "Svelte",
    "Vue.js",
    "React.js",
    "Ruby on Rails",
    "Spring Boot",
    // acronyms (case-sensitive)
    "API",
    "SDK",
    "CLI",
    "IDE",
    "SQL",
    "HTML",
    "CSS",
    "JSON",
    "OOP",
    "TDD",
    "ORM",
  ];

  const DEFAULT_SETTINGS = {
    enabled: true,
    keywords: DEFAULT_KEYWORDS,
    // "No-work mode": when on, devKeywords are filtered too (on top of the AI list).
    hideDev: false,
    devKeywords: DEFAULT_DEV_KEYWORDS,
    // Block whole sources regardless of text: subreddits ("r/ChatGPT"), YouTube
    // channels, or link domains ("the-decoder.de"). Case-insensitive substring match.
    blockedSources: [],
    // Hostnames where the user has turned filtering off (per-site toggle in the popup).
    disabledSites: [],
    // "hide" removes matched items; "blur" obscures them with a click-to-reveal.
    action: "hide",
    // Strip Google's injected "AI Overview" / "KI-Übersicht" answer block.
    hideGoogleAiOverview: true,
    // Experimental: apply a best-effort generic adapter on supported hosts where no
    // specific adapter matched. Off by default (more false positives).
    genericMode: false,
  };

  return { DEFAULT_KEYWORDS, DEFAULT_DEV_KEYWORDS, DEFAULT_SETTINGS };
});
