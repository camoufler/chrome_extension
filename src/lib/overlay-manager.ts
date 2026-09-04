import { settingsStorage } from './storage';
import { collectTextFields } from './text-fields';
import { paraphraseText, stopParaphrasing } from './webllm';

const HOST_ID = 'aicamouflage-overlay-host';

interface FieldState {
  controls: HTMLDivElement;
  button: HTMLButtonElement;
  revertButton: HTMLButtonElement;
  requestId: number;
  applying: boolean;
  originalText: string | null;
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
        marker.revertButton.remove();
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
      .overlay-button {
        display: flex;
        box-sizing: border-box;
        border: 0;
        background: transparent;
        cursor: pointer;
        pointer-events: auto;
        align-items: center;
        justify-content: center;
      }
      .overlay-controls {
        position: fixed;
        display: flex;
        box-sizing: border-box;
        gap: 2px;
        padding: 2px;
        align-items: center;
        border: 1px solid rgba(23, 32, 51, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 1px 3px rgba(23, 32, 51, 0.2);
        pointer-events: none;
        transition: width 180ms ease;
      }
      .logo-button {
        padding: 1px 4px;
      }
      .logo-button.loading {
        cursor: wait;
      }
      .logo-button.loading .logo {
        animation: aicamouflage-spin 1s linear infinite;
      }
      .revert-button {
        display: none;
        padding: 1px 8px;
        color: #172033;
        font: 12px/1.2 sans-serif;
        opacity: 0;
        visibility: hidden;
        transform: translateX(6px);
        transition:
          opacity 140ms ease,
          transform 180ms ease,
          visibility 0s linear 180ms;
      }
      .overlay-controls.expanded .revert-button {
        opacity: 1;
        visibility: visible;
        display: flex;
        transform: translateX(0);
        transition-delay: 40ms, 0ms, 0ms;
      }
      .overlay-controls.expanded .logo-button {
        border-left: 1px solid rgba(23, 32, 51, 0.2);
        padding-left: 6px;
      }
      @keyframes aicamouflage-spin {
        to { transform: rotate(360deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .logo-button.loading .logo {
          animation: none;
        }
        .overlay-controls,
        .revert-button {
          transition: none;
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
    button.className = 'overlay-button logo-button';
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

    const revertButton = document.createElement('button');
    revertButton.className = 'overlay-button revert-button';
    revertButton.type = 'button';
    revertButton.textContent = 'Revert';
    revertButton.title = 'Restore text before paraphrasing';
    revertButton.setAttribute('aria-label', 'Restore text before paraphrasing');

    const controls = document.createElement('div');
    controls.className = 'overlay-controls';
    controls.append(revertButton, button);

    const state: FieldState = {
      controls,
      button,
      revertButton,
      requestId: 0,
      applying: false,
      originalText: null,
      inputListener: () => {
        if (state.applying) {
          state.applying = false;
          return;
        }

        if (state.originalText !== null) {
          state.originalText = null;
          state.controls.classList.remove('expanded');
        }
        this.cancelParaphrase(state);
      },
    };
    button.addEventListener('click', () => void this.paraphrase(field, state));
    revertButton.addEventListener('click', () => {
      if (state.originalText === null) {
        return;
      }

      const originalText = state.originalText;
      state.originalText = null;
      state.controls.classList.remove('expanded');
      state.applying = true;
      applyOutput(field, originalText);
    });
    field.addEventListener('input', state.inputListener);
    this.layer.append(controls);
    this.markers.set(field, state);
    this.resizeObserver.observe(field);
  }

  private clearMarkers(): void {
    for (const [field, marker] of this.markers) {
      marker.button.remove();
      marker.controls.remove();
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
    const buttonWidth = size + 12;
    const buttonHeight = size + 6;
    const revertWidth = 58;
    const groupPadding = 4;
    const buttonGap = 2;

    for (const [field, state] of this.markers) {
      const rect = field.getBoundingClientRect();
      const revertVisible = state.originalText !== null;
      const requiredWidth =
        buttonWidth +
        (revertVisible ? revertWidth + buttonGap : 0) +
        groupPadding +
        inset * 2;
      const fits = rect.width >= requiredWidth && rect.height >= buttonHeight;
      const inViewport =
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;

      if (!fits || !inViewport) {
        state.controls.style.display = 'none';
        continue;
      }

      state.controls.style.display = 'flex';
      state.controls.classList.toggle('expanded', revertVisible);
      state.controls.style.width =
        `${buttonWidth + (revertVisible ? revertWidth + buttonGap : 0) + groupPadding}px`;
      state.controls.style.height = `${buttonHeight}px`;
      state.controls.style.top = `${rect.bottom - buttonHeight - inset}px`;
      state.controls.style.left =
        `${rect.right - buttonWidth - inset - (revertVisible ? revertWidth + buttonGap : 0)}px`;
      state.button.style.width = `${buttonWidth}px`;
      state.button.style.height = `${buttonHeight}px`;
      state.revertButton.style.width = `${revertWidth}px`;
      state.revertButton.style.height = `${buttonHeight}px`;
    }
  }

  private async paraphrase(field: HTMLElement, state: FieldState): Promise<void> {
    const text = getFieldText(field);
    if (!text.trim()) {
      return;
    }

    const requestId = ++state.requestId;
    state.button.classList.add('loading');
    state.button.disabled = true;
    state.button.setAttribute('aria-busy', 'true');
    this.scheduleLayout();

    try {
      const settings = await settingsStorage.getValue();
      const result = await paraphraseText(text, settings.modelId);
      if (state.requestId === requestId) {
        state.originalText = text;
        state.applying = true;
        applyOutput(field, result);
        state.controls.classList.add('expanded');
        this.scheduleLayout();
      }
    } catch (cause) {
      if (state.requestId === requestId) {
        const message = cause instanceof Error ? cause.message : 'Unable to paraphrase text.';
        state.button.title = message;
      }
    } finally {
      if (state.requestId === requestId) {
        state.button.classList.remove('loading');
        state.button.disabled = false;
        state.button.removeAttribute('aria-busy');
        this.scheduleLayout();
      }
    }
  }

  private cancelParaphrase(state: FieldState): void {
    state.requestId += 1;
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
