import {
  CreateExtensionServiceWorkerMLCEngine,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import { useCallback, useEffect, useState } from 'react';
import {
  MAX_LOGO_SIZE,
  MIN_LOGO_SIZE,
  type AppSettings,
} from '@/lib/settings';
import { settingsStorage } from '@/lib/storage';
import './PopupApp.css';

export function PopupApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void settingsStorage.getValue().then(setSettings);
    return settingsStorage.watch((value) => {
      if (value) {
        setSettings(value);
      }
    });
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const current = await settingsStorage.getValue();
    await settingsStorage.setValue({ ...current, ...patch });
  }, []);

  const loadModel = useCallback(async () => {
    if (!settings) {
      return;
    }

    setBusy(true);
    setError('');
    setProgress('Connecting to the extension service worker…');

    try {
      await CreateExtensionServiceWorkerMLCEngine(settings.modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          setProgress(report.text);
        },
      });
      await update({ webllmEnabled: true });
      setProgress('Model ready.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load WebLLM.';
      setError(message);
      setProgress('');
    } finally {
      setBusy(false);
    }
  }, [settings, update]);

  if (!settings) {
    return (
      <main className="popup">
        <p className="muted">Loading settings…</p>
      </main>
    );
  }

  return (
    <main className="popup">
      <header className="header">
        <img src="/icons/icon48.png" width={32} height={32} alt="" />
        <div>
          <h1>AICamouflage</h1>
          <p className="muted">Marks text fields on the active tab.</p>
        </div>
      </header>

      <label className="row">
        <span>Show logo on text fields</span>
        <input
          type="checkbox"
          checked={settings.overlaysEnabled}
          onChange={(event) => {
            void update({ overlaysEnabled: event.target.checked });
          }}
        />
      </label>

      <label className="stack">
        <span>
          Logo size <strong>{settings.logoSize}px</strong>
        </span>
        <input
          type="range"
          min={MIN_LOGO_SIZE}
          max={MAX_LOGO_SIZE}
          value={settings.logoSize}
          onChange={(event) => {
            void update({ logoSize: Number(event.target.value) });
          }}
        />
      </label>

      <section className="panel">
        <h2>On-device WebLLM</h2>
        <p className="muted">
          Loads a small local model in the extension service worker. The first download can take
          several minutes.
        </p>
        <p className="model">{settings.modelId}</p>
        <button type="button" disabled={busy} onClick={() => void loadModel()}>
          {busy ? 'Loading…' : settings.webllmEnabled ? 'Reload model' : 'Load model'}
        </button>
        {progress ? <p className="muted">{progress}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
