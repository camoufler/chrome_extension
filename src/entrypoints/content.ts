export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
    if (!hasExtensionContext()) {
      return;
    }

    try {
      const [{ TextFieldOverlayManager }, { settingsStorage }] = await Promise.all([
        import('@/lib/overlay-manager'),
        import('@/lib/storage'),
      ]);
      const logoUrl = getExtensionUrl('/icons/icon32.png');
      if (!logoUrl) {
        return;
      }

      const overlay = new TextFieldOverlayManager(logoUrl);
      overlay.start();
      let unwatch = () => {};

      const stop = () => {
        unwatch();
        overlay.stop();
      };

      const applySettings = async () => {
        try {
          const settings = await settingsStorage.getValue();
          overlay.setEnabled(settings.overlaysEnabled);
          overlay.setLogoSize(settings.logoSize);
        } catch (cause) {
          if (isExtensionContextInvalidated(cause)) {
            stop();
          } else {
            throw cause;
          }
        }
      };

      await applySettings();
      if (!hasExtensionContext()) {
        stop();
        return;
      }

      unwatch = settingsStorage.watch(() => {
        void applySettings();
      });

      window.addEventListener('pagehide', () => {
        stop();
      });
    } catch (cause) {
      if (isExtensionContextInvalidated(cause)) {
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
