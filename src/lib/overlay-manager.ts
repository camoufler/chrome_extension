import { settingsStorage } from './storage';
import { collectTextFields } from './text-fields';
import { paraphraseText, stopParaphrasing } from './webllm';

const HOST_ID = 'aicamouflage-overlay-host';

interface FieldState {
  button: HTMLButtonElement;
  output: HTMLTextAreaElement;
  applyButton: HTMLButtonElement;
  requestId: number;
  applying: boolean;
  inputListener: () => void;
}

export class TextFieldOverlayManager {
  private readonly logoUrl: string;
  private readonly markers = new Map<HTMLElement, FieldState>();
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  private host: HTMLDivElement | null = null;
  private layer: HTMLDivElement | null = null;
  private enabled = true;
  private logoSize = 18;
  private frame = 0;

  constructor(logoUrl: string) {
    this.logoUrl = logoUrl;
    this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this.mutationObserver = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target === this.host)) {
        return;
      }

      this.scan();
    });
  }

  start(): void {
    this.ensureHost();
    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'type', 'contenteditable', 'disabled', 'readonly'],
    });

    document.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('scroll', this.onViewportChange);
    this.scan();
  }

  stop(): void {
    this.mutationObserver.disconnect();
    document.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    window.visualViewport?.removeEventListener('resize', this.onViewportChange);
    window.visualViewport?.removeEventListener('scroll', this.onViewportChange);
    this.clearMarkers();
    this.host?.remove();
    this.host = null;
    this.layer = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearMarkers();
      return;
    }

    this.scan();
  }

  setLogoSize(size: number): void {
    this.logoSize = size;
    this.scheduleLayout();
  }

  scan(): void {
    if (!this.enabled) {
      this.clearMarkers();
      return;
    }

    const fields = new Set(collectTextFields());
    for (const [field, marker] of this.markers) {
      if (!fields.has(field) || !field.isConnected) {
        marker.button.remove();
        marker.output.remove();
        field.removeEventListener('input', marker.inputListener);
        this.markers.delete(field);
        this.resizeObserver.unobserve(field);
      }
    }

    for (const field of fields) {
      if (!this.markers.has(field)) {
        this.attachMarker(field);
      }
    }

    this.scheduleLayout();
  }

  private readonly onViewportChange = (): void => {
    this.scheduleLayout();
  };

  private ensureHost(): void {
    if (this.host && this.layer) {
      return;
    }

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.dataset.aicamouflageIgnore = 'true';
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '2147483647';

    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
      }
      .logo {
        display: block;
        object-fit: contain;
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.45));
      }
      .logo-button {
        position: fixed;
        display: block;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        pointer-events: auto;
      }
      .logo-button.loading {
        cursor: wait;
      }
      .logo-button.loading .logo {
        animation: aicamouflage-spin 1s linear infinite;
      }
      .paraphrase-output {
        position: fixed;
        display: block;
        min-height: 56px;
        box-sizing: border-box;
        padding: 8px;
        border: 1px solid #7c8da6;
        border-radius: 4px;
        background: #fff;
        color: #172033;
        font: 13px/1.4 sans-serif;
        resize: vertical;
        pointer-events: auto;
        user-select: text;
      }
      .apply-button {
        position: fixed;
        padding: 4px 8px;
        border: 1px solid #7c8da6;
        border-radius: 4px;
        background: #fff;
        color: #172033;
        font: 12px/1.2 sans-serif;
        cursor: pointer;
        pointer-events: auto;
      }
      .apply-button:disabled {
        cursor: default;
        opacity: 0.65;
      }
      .paraphrase-output.loading {
        background: linear-gradient(90deg, #fff 25%, #e8edf5 50%, #fff 75%);
        background-size: 200% 100%;
        animation: aicamouflage-shimmer 1.4s ease-in-out infinite;
      }
      @keyframes aicamouflage-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes aicamouflage-shimmer {
        to { background-position: -200% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .logo-button.loading .logo,
        .paraphrase-output.loading {
          animation: none;
        }
      }
    `;

    const layer = document.createElement('div');
    layer.className = 'layer';
    shadow.append(style, layer);

    document.documentElement.append(host);
    this.host = host;
    this.layer = layer;
  }

  private attachMarker(field: HTMLElement): void {
    this.ensureHost();
    if (!this.layer) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'logo-button';
    button.type = 'button';
    button.title = 'Paraphrase with AICamouflage';
    button.setAttribute('aria-label', 'Paraphrase text with AICamouflage');

    const marker = document.createElement('img');
    marker.className = 'logo';
    marker.alt = '';
    marker.src = this.logoUrl;
    marker.width = this.logoSize;
    marker.height = this.logoSize;
    button.append(marker);

    const output = document.createElement('textarea');
    output.className = 'paraphrase-output';
    output.hidden = true;
    output.readOnly = true;
    output.wrap = 'off';
    output.spellcheck = false;
    output.setAttribute('aria-label', 'Paraphrased text');

    const applyButton = document.createElement('button');
    applyButton.className = 'apply-button';
    applyButton.type = 'button';
    applyButton.textContent = 'Apply';
    applyButton.hidden = true;
    applyButton.setAttribute('aria-label', 'Apply paraphrased text');

    const state: FieldState = {
      button,
      output,
      applyButton,
      requestId: 0,
      applying: false,
      inputListener: () => {
        if (state.applying) {
          state.applying = false;
          return;
        }

        this.cancelParaphrase(state);
      },
    };
    button.addEventListener('click', () => void this.paraphrase(field, state));
    applyButton.addEventListener('click', () => {
      state.applying = true;
      applyOutput(field, output.value);
      applyButton.textContent = 'Applied';
      window.setTimeout(() => {
        applyButton.textContent = 'Apply';
      }, 1200);
    });
    field.addEventListener('input', state.inputListener);
    this.layer.append(button, output, applyButton);
    this.markers.set(field, state);
    this.resizeObserver.observe(field);
  }

  private clearMarkers(): void {
    for (const [field, marker] of this.markers) {
      marker.button.remove();
      marker.output.remove();
      marker.applyButton.remove();
      field.removeEventListener('input', marker.inputListener);
      this.resizeObserver.unobserve(field);
    }
    this.markers.clear();
  }

  private scheduleLayout(): void {
    if (this.frame) {
      return;
    }

    this.frame = window.requestAnimationFrame(() => {
      this.frame = 0;
      this.layout();
    });
  }

  private layout(): void {
    const size = this.logoSize;
    const inset = Math.max(4, Math.round(size / 5));

    for (const [field, state] of this.markers) {
      const rect = field.getBoundingClientRect();
      const fits = rect.width >= size + inset * 2 && rect.height >= size;
      const inViewport =
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;

      if (!fits || !inViewport) {
        state.button.style.display = 'none';
        state.output.style.display = 'none';
        state.applyButton.style.display = 'none';
        continue;
      }

      state.button.style.display = 'block';
      state.button.style.width = `${size}px`;
      state.button.style.height = `${size}px`;
      state.button.style.top = `${rect.top + (rect.height - size) / 2}px`;
      state.button.style.left = `${rect.right - size - inset}px`;
      state.output.style.display = state.output.hidden ? 'none' : 'block';
      state.output.style.top = `${rect.bottom + 6}px`;
      state.output.style.left = `${rect.left}px`;
      state.output.style.width = `${rect.width}px`;
      state.applyButton.hidden =
        state.output.hidden || state.output.classList.contains('loading') || !state.output.value.trim();
      state.applyButton.style.display = state.applyButton.hidden ? 'none' : 'block';
      state.applyButton.style.top = `${rect.bottom + 6}px`;
      state.applyButton.style.left = `${rect.right - 52}px`;
    }
  }

  private async paraphrase(field: HTMLElement, state: FieldState): Promise<void> {
    const text = getFieldText(field);
    if (!text.trim()) {
      return;
    }

    const requestId = ++state.requestId;
    state.output.hidden = false;
    state.output.value = 'Paraphrasing locally...';
    state.output.classList.add('loading');
    state.button.classList.add('loading');
    state.button.disabled = true;
    state.button.setAttribute('aria-busy', 'true');
    this.scheduleLayout();

    try {
      const settings = await settingsStorage.getValue();
      const result = await paraphraseText(text, settings.modelId);
      if (state.requestId === requestId) {
        state.output.value = result;
        state.applyButton.hidden = false;
      }
    } catch (cause) {
      if (state.requestId === requestId) {
        state.output.value = cause instanceof Error ? cause.message : 'Unable to paraphrase text.';
      }
    } finally {
      if (state.requestId === requestId) {
        state.output.classList.remove('loading');
        state.button.classList.remove('loading');
        state.button.disabled = false;
        state.button.removeAttribute('aria-busy');
        this.scheduleLayout();
      }
    }
  }

  private cancelParaphrase(state: FieldState): void {
    state.requestId += 1;
    state.output.hidden = true;
    state.output.value = '';
    state.applyButton.hidden = true;
    state.output.classList.remove('loading');
    state.button.classList.remove('loading');
    state.button.disabled = false;
    state.button.removeAttribute('aria-busy');
    void stopParaphrasing();
  }
}

function applyOutput(field: HTMLElement, text: string): void {
  if (field instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(field, text);
  } else if (field instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
  } else {
    field.textContent = text;
  }

  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

function getFieldText(field: HTMLElement): string {
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    return field.value;
  }

  return field.textContent ?? '';
}
