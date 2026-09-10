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
    name: "Camoufler",
    description:
      "Scan the active tab for text fields and mark them with the Camoufler logo.",
    permissions: ["storage", "unlimitedStorage", "activeTab"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["icons/*", "prompts/standard.json"],
        matches: ["<all_urls>"],
      },
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    icons: {
      16: "/icons/icon16.png",
      32: "/icons/icon32.png",
      48: "/icons/icon48.png",
      128: "/icons/icon128.png",
    },
    action: {
      default_title: "Camoufler",
      default_icon: {
        16: "/icons/icon16.png",
        32: "/icons/icon32.png",
        48: "/icons/icon48.png",
        128: "/icons/icon128.png",
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
