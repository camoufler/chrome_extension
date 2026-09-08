import {
  CreateExtensionServiceWorkerMLCEngine,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from '@/lib/settings';
import { BUNDLED_MODEL_ID, getBundledEngineConfig } from '@/lib/model';
import { settingsStorage } from '@/lib/storage';
import { debug } from '@/lib/debug';
import './PopupApp.css';

export function PopupApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let unwatch = () => {};

    void settingsStorage
      .getValue()
      .then(async (value) => {
        const settings = normalizeSettings(value);
        if (settings !== value) {
          await settingsStorage.setValue(settings);
        }
        debug('popup: settings loaded', settings);
        setSettings(settings);
        unwatch = settingsStorage.watch((nextValue) => {
          const nextSettings = normalizeSettings(nextValue);
          debug('popup: settings changed', nextSettings);
          setSettings(nextSettings);
        });
      })
      .catch((cause) => {
        debug('popup: settings load failed', cause);
        setSettings(DEFAULT_SETTINGS);
        setError(
          cause instanceof Error
            ? cause.message
            : 'Camoufler must be opened from the installed extension.',
        );
      });

    return () => unwatch();
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    debug('popup: update', patch);
    const current = await settingsStorage.getValue();
    await settingsStorage.setValue({ ...current, ...patch });
  }, []);

  const loadModel = useCallback(async () => {
    if (!settings) {
      return;
    }

    debug('popup: loadModel start', settings.modelId);
    setBusy(true);
    setError('');
    setProgress('Connecting to the extension service worker…');

    try {
      await CreateExtensionServiceWorkerMLCEngine(
        BUNDLED_MODEL_ID,
        getBundledEngineConfig((report: InitProgressReport) => {
          debug('popup: loadModel progress', report.text);
          setProgress(report.text);
        }),
      );
      await update({ webllmEnabled: true, modelId: BUNDLED_MODEL_ID });
      debug('popup: loadModel ready', settings.modelId);
      setProgress('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load WebLLM.';
      debug('popup: loadModel failed', message);
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
        <img src="/icons/Camoufler.svg" width={32} height={32} alt="" />
        <div>
          <h1>Camoufler</h1>
          <p className="muted">Your digital camouflage in this world.</p>
        </div>
      </header>

      <label className="row">
        <span>Our goal is to make your footprints less personalized to <b>AI</b> systems.</span>
      </label>

      <label className="row">
        <span>Show overlays</span>
        <input
          type="checkbox"
          checked={settings.overlaysEnabled}
          onChange={(event) => {
            void update({ overlaysEnabled: event.target.checked });
          }}
        />
      </label>

      <section className="panel">
        <h2>Local hosted LLM</h2>
        <p className="muted">We run a local LLM locally to keep your inputs <b>private</b>.</p>
        {settings.webllmEnabled ? (
          <div className="model-status" role="status">
            <span className="model">Current model: {settings.modelName}</span>
          </div>
        ) : (
          <>
            <p className="muted">
              Loads the bundled on-device model in the extension service worker. The first load
              copies it onto the GPU.
            </p>
            <p className="model">Bundled model: {settings.modelName}</p>
            <button type="button" disabled={busy} onClick={() => void loadModel()}>
              {busy ? 'Loading…' : 'Load model'}
            </button>
          </>
        )}
        {progress ? <p className="muted">{progress}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
