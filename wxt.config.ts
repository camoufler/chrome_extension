import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  manifest: {
    name: 'Camoufler',
    description:
      'Scan the active tab for text fields and mark them with the Camoufler logo.',
    permissions: ['storage', 'unlimitedStorage'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://*.claude.ai/*',
      'https://copilot.microsoft.com/*',
      'https://www.bing.com/chat*',
      'https://*.githubcopilot.com/*',
      'https://github.com/copilot*',
      'https://gemini.google.com/*',
      'https://www.perplexity.ai/*',
      'https://*.perplexity.ai/*',
      'https://poe.com/*',
      'https://*.poe.com/*',
      'https://you.com/*',
      'https://www.you.com/*',
      'https://grok.com/*',
      'https://x.ai/*',
      'https://chat.deepseek.com/*',
      'https://deepseek.com/*',
      'https://chat.mistral.ai/*',
      'https://app.mistral.ai/*',
      'https://openrouter.ai/*',
      'https://*.openrouter.ai/*',
      'https://huggingface.co/chat*',
    ],
    web_accessible_resources: [
      {
        resources: ['icons/*', 'prompts/standard.json'],
        matches: [
          'https://chatgpt.com/*',
          'https://chat.openai.com/*',
          'https://claude.ai/*',
          'https://*.claude.ai/*',
          'https://copilot.microsoft.com/*',
          'https://www.bing.com/chat*',
          'https://*.githubcopilot.com/*',
          'https://github.com/copilot*',
          'https://gemini.google.com/*',
          'https://www.perplexity.ai/*',
          'https://*.perplexity.ai/*',
          'https://poe.com/*',
          'https://*.poe.com/*',
          'https://you.com/*',
          'https://www.you.com/*',
          'https://grok.com/*',
          'https://x.ai/*',
          'https://chat.deepseek.com/*',
          'https://deepseek.com/*',
          'https://chat.mistral.ai/*',
          'https://app.mistral.ai/*',
          'https://openrouter.ai/*',
          'https://*.openrouter.ai/*',
          'https://huggingface.co/chat*',
        ],
      },
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    icons: {
      16: '/icons/icon16.png',
      32: '/icons/icon32.png',
      48: '/icons/icon48.png',
      128: '/icons/icon128.png',
    },
    action: {
      default_title: 'Camoufler',
      default_icon: {
        16: '/icons/icon16.png',
        32: '/icons/icon32.png',
        48: '/icons/icon48.png',
        128: '/icons/icon128.png',
      },
    },
  },
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 7000,
    },
    optimizeDeps: {
      exclude: ["@mlc-ai/web-llm"],
    },
  }),
  webExt: {
    // web-ext otherwise injects --disable-blink-features=AutomationControlled,
    // which Chrome flags as unsupported and shows an infobar.
    chromiumArgs: ["--enable-blink-features=AutomationControlled"],
  },
});
