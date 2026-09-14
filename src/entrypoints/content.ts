import { debug } from '@/lib/debug';

const SUPPORTED_AIPROVIDER_PATTERNS = [
  /^https:\/\/chatgpt\.com\//,
  /^https:\/\/chat\.openai\.com\//,
  /^https:\/\/claude\.ai\//,
  /^https:\/\/([a-z0-9-]+\.)?claude\.ai\//,
  /^https:\/\/copilot\.microsoft\.com\//,
  /^https:\/\/www\.bing\.com\/chat\b/,
  /^https:\/\/([a-z0-9-]+\.)?githubcopilot\.com\//,
  /^https:\/\/github\.com\/copilot\b/,
  /^https:\/\/gemini\.google\.com\//,
  /^https:\/\/www\.perplexity\.ai\//,
  /^https:\/\/([a-z0-9-]+\.)?perplexity\.ai\//,
  /^https:\/\/poe\.com\//,
  /^https:\/\/([a-z0-9-]+\.)?poe\.com\//,
  /^https:\/\/((www\.)?you\.com)\//,
  /^https:\/\/grok\.com\//,
  /^https:\/\/x\.ai\//,
  /^https:\/\/chat\.deepseek\.com\//,
  /^https:\/\/deepseek\.com\//,
  /^https:\/\/chat\.mistral\.ai\//,
  /^https:\/\/app\.mistral\.ai\//,
  /^https:\/\/((www\.)?openrouter\.ai)\//,
  /^https:\/\/([a-z0-9-]+\.)?openrouter\.ai\//,
  /^https:\/\/huggingface\.co\/chat\b/,
];

export default defineContentScript({
  matches: [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://*.claude.ai/*',
    'https://copilot.microsoft.com/*',
    'https://www.bing.com/*',
    'https://*.githubcopilot.com/*',
    'https://github.com/*',
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
    'https://huggingface.co/*',
  ],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
    if (!isSupportedAiProviderUrl(location.href)) {
      debug('content: skip, unsupported site', location.href);
      return;
    }

    if (!hasExtensionContext()) {
      debug('content: skip, no extension context');
      return;
    }

    try {
      const [{ TextFieldOverlayManager }, { settingsStorage }, { normalizeSettings }] =
        await Promise.all([
          import('@/lib/overlay-manager'),
          import('@/lib/storage'),
          import('@/lib/settings'),
        ]);
      const logoUrl = getExtensionUrl('/icons/CamouflerLogo.svg');
      if (!logoUrl) {
        debug('content: skip, no logo url');
        return;
      }

      const overlay = new TextFieldOverlayManager(logoUrl);
      await overlay.start();
      debug('content: started', location.href);
      let unwatch = () => {};

      const stop = (reason: string) => {
        debug('content: stop', reason);
        unwatch();
        overlay.stop();
      };

      const applySettings = async () => {
        try {
          const stored = await settingsStorage.getValue();
          const settings = normalizeSettings(stored);
          if (settings !== stored) {
            await settingsStorage.setValue(settings);
          }
          const isReady = Boolean(settings.webllmEnabled) && Boolean(settings.modelId);
          debug('content: apply settings', {
            overlaysEnabled: settings.overlaysEnabled,
            webllmEnabled: settings.webllmEnabled,
            modelId: settings.modelId,
            isReady,
          });
          overlay.setEnabled(isReady && Boolean(settings.overlaysEnabled));
        } catch (cause) {
          if (isExtensionContextInvalidated(cause)) {
            stop('extension context invalidated');
          } else {
            throw cause;
          }
        }
      };

      await applySettings();
      if (!hasExtensionContext()) {
        stop('extension context lost after settings');
        return;
      }

      unwatch = settingsStorage.watch(() => {
        debug('content: settings changed');
        void applySettings();
      });

      window.addEventListener('pagehide', () => {
        stop('pagehide');
      });
    } catch (cause) {
      if (isExtensionContextInvalidated(cause)) {
        debug('content: extension context invalidated');
        return;
      }
      throw cause;
    }
  },
});

type ChromeRuntime = {
  id?: string;
  getURL: (path: string) => string;
};

function hasExtensionContext(): boolean {
  try {
    return Boolean(getChromeRuntime()?.id);
  } catch {
    return false;
  }
}

function getExtensionUrl(path: string): string | null {
  try {
    const runtime = getChromeRuntime();
    return runtime?.id ? runtime.getURL(path) : null;
  } catch (cause) {
    if (isExtensionContextInvalidated(cause)) {
      return null;
    }
    throw cause;
  }
}

function getChromeRuntime(): ChromeRuntime | undefined {
  return (globalThis as typeof globalThis & { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
}

function isSupportedAiProviderUrl(url: string): boolean {
  return SUPPORTED_AIPROVIDER_PATTERNS.some((pattern) => pattern.test(url));
}

function isExtensionContextInvalidated(cause: unknown): boolean {
  return cause instanceof Error && cause.message.includes('Extension context invalidated');
}
