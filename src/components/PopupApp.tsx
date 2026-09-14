import {
  CreateExtensionServiceWorkerMLCEngine,
  type InitProgressReport,
} from '@mlc-ai/web-llm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from '@/lib/settings';
import { BUNDLED_MODEL_ID, getBundledEngineConfig } from '@/lib/model';
import { settingsStorage } from '@/lib/storage';
import { debug } from '@/lib/debug';
import { isWebGPUAvailable } from '@/lib/webllm';
import './PopupApp.css';

export function PopupApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const progressRef = useRef(0);
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

  const updateProgress = useCallback((nextValue: number) => {
    const clamped = Math.min(Math.max(nextValue, 0), 100);
    const resolved = Math.max(progressRef.current, clamped);
    progressRef.current = resolved;
    setProgress(resolved);
  }, []);

  const loadModel = useCallback(async () => {
    if (!settings) {
      return;
    }

    debug('popup: loadModel start', settings.modelId);

    if (!isWebGPUAvailable()) {
      setBusy(false);
      setError('WebGPU is not supported in this browser, so the local protection model cannot run.');
      progressRef.current = 0;
      setProgress(null);
      return;
    }

    setBusy(true);
    setError('');
    progressRef.current = 0;
    setProgress(0);

    try {
      await CreateExtensionServiceWorkerMLCEngine(
        BUNDLED_MODEL_ID,
        getBundledEngineConfig((report: InitProgressReport) => {
          const nextProgress = Math.min(Math.max(report.progress ?? 0, 0), 1) * 100;
          debug('popup: loadModel progress', { progress: nextProgress, text: report.text });
          updateProgress(nextProgress);
        }),
      );
      await update({ webllmEnabled: true, modelId: BUNDLED_MODEL_ID });
      debug('popup: loadModel ready', settings.modelId);
      progressRef.current = 100;
      setProgress(100);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to load WebLLM.';
      debug('popup: loadModel failed', message);
      setError(message);
      progressRef.current = 0;
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }, [settings, update, updateProgress]);

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
        <img src="/icons/CamouflerLogo.svg" width={32} height={32} alt="" />
        <div>
          <h1>Camoufler</h1>
          <p className="muted">
            "Protect your data when using AI"
          </p>
        </div>
      </header>

      {settings.webllmEnabled ? (
        <label className="row">
          <span>Show Camoufler button</span>
          <input
            type="checkbox"
            checked={settings.overlaysEnabled}
            onChange={(event) => {
              void update({ overlaysEnabled: event.target.checked });
            }}
          />
        </label>
      ) : null}

      {settings.webllmEnabled ? (
        <section className="panel">
          <div className="mode-selection" role="radiogroup" aria-label="Output mode selection">
            <label className="mode-option">
              <input
                type="radio"
                name="modeSelection"
                checked={settings.modeSelection === 'generalize'}
                onChange={() => void update({ modeSelection: 'generalize' })}
              />
              <span>Protect my identity</span>
            </label>

            <label className="mode-option disabled-option">
              <input
                type="radio"
                name="modeSelection"
                checked={settings.modeSelection === 'removePpi'}
                onChange={() => void update({ modeSelection: 'removePpi' })}
                disabled
              />
              <span>Hide private information</span>
            </label>

            <label className="mode-option disabled-option">
              <input
                type="radio"
                name="modeSelection"
                checked={settings.modeSelection === 'both'}
                onChange={() => void update({ modeSelection: 'both' })}
                disabled
              />
              <span>Maximum protection</span>
            </label>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <p className="muted">Camoufler uses a local AI model to protect your messages before they are sent to AI.</p>
        {settings.webllmEnabled ? (
          <div className="model-status" role="status">
            <span className="model">Current model: {settings.modelName}</span>
          </div>
        ) : (
          <>
            <p className="model">Model: {settings.modelName}</p>
            <button type="button" disabled={busy} onClick={() => void loadModel()}>
              {busy ? 'Loading…' : 'Load protection model'}
            </button>
          </>
        )}
        {busy && progress !== null ? (
          <div className="progress-block" aria-live="polite">
            <div className="progress-meta">
              <span>Downloading model</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
