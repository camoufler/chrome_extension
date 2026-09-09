import { debug } from '@/lib/debug';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
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
      const logoUrl = getExtensionUrl('/icons/Camoufler.svg');
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

function isExtensionContextInvalidated(cause: unknown): boolean {
  return cause instanceof Error && cause.message.includes('Extension context invalidated');
}
