import { TextFieldOverlayManager } from '@/lib/overlay-manager';
import { settingsStorage } from '@/lib/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
    if (!hasExtensionContext()) {
      return;
    }

    let logoUrl: string;
    try {
      logoUrl = browser.runtime.getURL('/icons/icon32.png');
    } catch (cause) {
      if (isExtensionContextInvalidated(cause)) {
        return;
      }
      throw cause;
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
  },
});

function hasExtensionContext(): boolean {
  try {
    return Boolean(browser.runtime?.id);
  } catch {
    return false;
  }
}

function isExtensionContextInvalidated(cause: unknown): boolean {
  return cause instanceof Error && cause.message.includes('Extension context invalidated');
}
