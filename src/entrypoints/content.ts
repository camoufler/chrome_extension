import { TextFieldOverlayManager } from '@/lib/overlay-manager';
import { settingsStorage } from '@/lib/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
    const logoUrl = browser.runtime.getURL('/icons/icon32.png');
    const overlay = new TextFieldOverlayManager(logoUrl);
    overlay.start();

    const applySettings = async () => {
      const settings = await settingsStorage.getValue();
      overlay.setEnabled(settings.overlaysEnabled);
      overlay.setLogoSize(settings.logoSize);
    };

    await applySettings();
    const unwatch = settingsStorage.watch(() => {
      void applySettings();
    });

    window.addEventListener('pagehide', () => {
      unwatch();
      overlay.stop();
    });
  },
});
