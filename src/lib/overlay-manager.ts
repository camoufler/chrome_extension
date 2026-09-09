import { debug, debugVerbose } from './debug';
import { BUNDLED_MODEL_ID } from './model';
import { overlayPositionsStorage, settingsStorage } from './storage';
import type { OverlayPosition, OverlayPositions } from './settings';
import { collectTextFields } from './text-fields';
import { paraphraseText, stopParaphrasing } from './webllm';

const HOST_ID = 'aicamouflage-overlay-host';

interface FieldState {
  controls: HTMLDivElement;
  button: HTMLButtonElement;
  logo: HTMLImageElement;
  revertButton: HTMLButtonElement;
  positionKey: string;
  requestId: number;
  applying: boolean;
  originalText: string | null;
  inputListener: () => void;
  drag: DragState | null;
  suppressClick: boolean;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  moved: boolean;
}

export class TextFieldOverlayManager {
  private readonly logoUrl: string;
  private readonly markers = new Map<HTMLElement, FieldState>();
  private readonly resizeObserver: ResizeObserver;
  private readonly mutationObserver: MutationObserver;
  private host: HTMLDivElement | null = null;
  private layer: HTMLDivElement | null = null;
  private enabled = true;
  private readonly logoSize = 18;
  private frame = 0;
  private pageKey = getPageKey();
  private positions: OverlayPositions = {};

  constructor(logoUrl: string) {
    this.logoUrl = logoUrl;
    this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
    this.mutationObserver = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target === this.host)) {
        return;
      }

      this.keepHostOnTop();
      this.scan();
    });
  }

  async start(): Promise<void> {
    debug('overlay: start', { pageKey: this.pageKey });
    this.positions = await overlayPositionsStorage.getValue();
    this.ensureHost();
    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'type', 'contenteditable', 'disabled', 'readonly'],
    });

    document.addEventListener('input', this.onDocumentInput, true);
    document.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('resize', this.onViewportChange);
    window.visualViewport?.addEventListener('scroll', this.onViewportChange);
    this.scan();
  }

  stop(): void {
    debug('overlay: stop');
    this.mutationObserver.disconnect();
    document.removeEventListener('input', this.onDocumentInput, true);
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
    debug('overlay: setEnabled', enabled);
    this.enabled = enabled;
    if (!enabled) {
      this.clearMarkers();
      return;
    }

    this.scan();
  }

  scan(): void {
    if (!this.enabled) {
      this.clearMarkers();
      return;
    }

    const fields = collectTextFields();
    const fieldSet = new Set(fields);
    let removed = 0;
    let attached = 0;
    for (const [field, marker] of this.markers) {
      if (!fieldSet.has(field) || !field.isConnected) {
        marker.button.remove();
        marker.revertButton.remove();
        marker.controls.remove();
        field.removeEventListener('input', marker.inputListener);
        this.markers.delete(field);
        this.resizeObserver.unobserve(field);
        removed += 1;
      }
    }

    fields.forEach((field, index) => {
      if (!this.markers.has(field)) {
        this.attachMarker(field, getFieldKey(field, index));
        attached += 1;
      }
    });

    if (attached || removed) {
      debug('overlay: scan', {
        fields: fields.length,
        attached,
        removed,
        markers: this.markers.size,
      });
    }

    this.scheduleLayout();
  }

  private readonly onDocumentInput = (): void => {
    this.scan();
  };

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
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
        pointer-events: none;
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.45));
      }
      @keyframes camoufler-swing {
        0% {
          transform: rotate(-8deg) translateY(0px);
          opacity: 0.8;
        }
        50% {
          transform: rotate(8deg) translateY(-1px);
          opacity: 1;
        }
        100% {
          transform: rotate(-8deg) translateY(0px);
          opacity: 0.8;
        }
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
        user-select: none;
        -webkit-user-select: none;
      }
      .overlay-controls {
        position: fixed;
        display: flex;
        box-sizing: border-box;
        gap: 2px;
        padding: 5px;
        align-items: center;
        border: 1px solid rgba(23, 32, 51, 0.28);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 1px 3px rgba(23, 32, 51, 0.2);
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        transition:
          width 180ms ease,
          left 180ms ease,
          box-shadow 180ms ease,
          transform 180ms ease,
          background-color 180ms ease;
      }
      .overlay-controls.dragging {
        cursor: grabbing;
      }
      .logo-button.loading ~ .logo-button {
        display: none;
      }
      .logo-button {
        padding: 1px 4px;
      }
      .overlay-controls.expanded .logo-button {
        position: relative;
      }
      .overlay-controls.expanded .logo-button::before {
        position: absolute;
        top: 3px;
        bottom: 3px;
        left: -2px;
        width: 1px;
        background: rgba(23, 32, 51, 0.2);
        content: '';
      }
      .logo-button.loading {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: wait;
        width: 18px;
        height: 18px;
        min-width: 18px;
        min-height: 18px;
      }
      .logo-button.loading .logo {
        display: block;
        animation: camoufler-swing 0.8s ease-in-out infinite;
        transform-origin: top center;
      }
      .logo-button.loading ~ .revert-button {
        display: none;
      }
      .overlay-controls:has(> .logo-button.loading) {
        background: #e8efff;
        box-shadow: 0 2px 12px rgba(23, 32, 51, 0.22);
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
      @media (prefers-reduced-motion: reduce) {
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

  private keepHostOnTop(): void {
    if (this.host && document.documentElement.lastElementChild !== this.host) {
      document.documentElement.append(this.host);
    }
  }

  private attachMarker(field: HTMLElement, positionKey: string): void {
    this.ensureHost();
    if (!this.layer) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'overlay-button logo-button';
    button.type = 'button';
    button.title = 'Paraphrase with Camoufler';
    button.setAttribute('aria-label', 'Paraphrase text with Camoufler');

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
      logo: marker,
      revertButton,
      positionKey,
      requestId: 0,
      applying: false,
      originalText: null,
      drag: null,
      suppressClick: false,
      inputListener: () => {
        if (state.applying) {
          state.applying = false;
          return;
        }

        if (state.originalText !== null) {
          state.originalText = null;
          state.controls.classList.remove('expanded');
        }

        if (!getFieldText(field).trim()) {
          this.cancelParaphrase(state);
          this.scan();
          return;
        }

        this.cancelParaphrase(state);
      },
    };
    button.addEventListener('click', (event) => {
      if (state.suppressClick) {
        state.suppressClick = false;
        event.preventDefault();
        return;
      }

      void this.paraphrase(field, state);
    });
    controls.addEventListener('pointerdown', (event) => {
      if (event.target === controls) {
        this.startDrag(state, event);
      }
    });
    controls.addEventListener('pointermove', (event) => this.moveDrag(state, event));
    controls.addEventListener('pointerup', (event) => this.endDrag(field, state, event));
    controls.addEventListener('pointercancel', (event) => this.endDrag(field, state, event));
    revertButton.addEventListener('click', () => {
      if (state.originalText === null) {
        return;
      }

      debug('overlay: revert', state.positionKey);
      const originalText = state.originalText;
      state.originalText = null;
      state.controls.classList.remove('expanded');
      this.cancelParaphrase(state);
      state.applying = false;
      state.suppressClick = false;
      state.button.disabled = false;
      state.button.classList.remove('loading');
      this.scheduleLayout();
      applyOutput(field, originalText);
    });
    field.addEventListener('input', state.inputListener);
    this.layer.append(controls);
    this.markers.set(field, state);
    this.resizeObserver.observe(field);
    debug('overlay: attach', positionKey);
  }

  private clearMarkers(): void {
    for (const [field, marker] of this.markers) {
      marker.button.remove();
      marker.revertButton.remove();
      marker.controls.remove();
      field.removeEventListener('input', marker.inputListener);
      this.resizeObserver.unobserve(field);
    }
    this.markers.clear();
  }

  private async setLoadingState(state: FieldState, loading: boolean): Promise<void> {
    if (loading) {
      state.button.classList.add('loading');
      state.button.style.width = '18px';
      state.button.style.height = '18px';
      state.button.style.minWidth = '18px';
      state.button.style.minHeight = '18px';
      state.logo.style.display = 'block';
      return;
    }

    state.button.classList.remove('loading');
    state.button.style.width = '';
    state.button.style.height = '';
    state.button.style.minWidth = '';
    state.button.style.minHeight = '';
    state.logo.style.display = 'block';
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
    const groupPadding = 10;
    const buttonGap = 2;
    const controlsHeight = buttonHeight + groupPadding + 2;

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

      if (state.drag) {
        continue;
      }

      const defaultRight = inset;
      const defaultBottom = inset;
      const position = this.positions[this.pageKey]?.[state.positionKey];
      const right = position?.right ?? defaultRight;
      const bottom = position?.bottom ?? defaultBottom;
      const controlEdgeInset = groupPadding / 2 + 1;
      const belowFits = window.innerHeight - rect.bottom >= controlsHeight + inset;
      const aboveFits = rect.top >= controlsHeight + inset;
      const useTop = !belowFits && aboveFits;

      state.controls.style.display = 'flex';
      state.controls.classList.toggle('expanded', revertVisible);
      state.controls.style.width =
        `${buttonWidth + (revertVisible ? revertWidth + buttonGap : 0) + groupPadding + 2}px`;
      state.controls.style.height = `${controlsHeight}px`;
      state.controls.style.left = '';
      state.controls.style.top = '';
      state.controls.style.right =
        `${window.innerWidth - (rect.right - right + controlEdgeInset)}px`;

      if (useTop) {
        const centeredTop = rect.top + rect.height / 2 - controlsHeight / 2;
        state.controls.style.bottom = '';
        state.controls.style.top = `${Math.min(
          Math.max(0, centeredTop),
          Math.max(0, window.innerHeight - controlsHeight),
        )}px`;
      } else {
        state.controls.style.top = '';
        state.controls.style.bottom =
          `${window.innerHeight - (rect.bottom - bottom + controlEdgeInset)}px`;
      }

      state.button.style.width = `${buttonWidth}px`;
      state.button.style.height = `${buttonHeight}px`;
      state.revertButton.style.width = `${revertWidth}px`;
      state.revertButton.style.height = `${buttonHeight}px`;
    }
  }

  private startDrag(state: FieldState, event: PointerEvent): void {
    const rect = state.controls.getBoundingClientRect();
    state.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    state.controls.style.right = '';
    state.controls.style.bottom = '';
    state.controls.classList.add('dragging');
    state.controls.setPointerCapture(event.pointerId);
  }

  private moveDrag(state: FieldState, event: PointerEvent): void {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) {
      return;
    }

    drag.moved = true;
    state.controls.style.right = '';
    state.controls.style.bottom = '';
    state.controls.style.left = `${drag.left + deltaX}px`;
    state.controls.style.top = `${drag.top + deltaY}px`;
    event.preventDefault();
  }

  private endDrag(field: HTMLElement, state: FieldState, event: PointerEvent): void {
    const drag = state.drag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    state.drag = null;
    state.controls.classList.remove('dragging');
    if (state.controls.hasPointerCapture(event.pointerId)) {
      state.controls.releasePointerCapture(event.pointerId);
    }

    if (drag.moved) {
      const fieldRect = field.getBoundingClientRect();
      const buttonRect = state.button.getBoundingClientRect();
      const position = {
        right: fieldRect.right - buttonRect.right,
        bottom: fieldRect.bottom - buttonRect.bottom,
      };
      this.savePosition(state.positionKey, position);
      state.suppressClick = true;
      event.preventDefault();
    }

    this.scheduleLayout();
  }

  private async savePosition(positionKey: string, position: OverlayPosition): Promise<void> {
    const cachedPagePositions = this.positions[this.pageKey] ?? {};
    cachedPagePositions[positionKey] = position;
    this.positions[this.pageKey] = cachedPagePositions;

    const positions = await overlayPositionsStorage.getValue();
    const storedPagePositions = positions[this.pageKey] ?? {};
    storedPagePositions[positionKey] = position;
    positions[this.pageKey] = storedPagePositions;
    await overlayPositionsStorage.setValue(positions);
    debug('overlay: savePosition', { pageKey: this.pageKey, positionKey, position });
  }

  private async paraphrase(field: HTMLElement, state: FieldState): Promise<void> {
    const text = getFieldText(field);
    if (!text.trim()) {
      return;
    }

    const requestId = ++state.requestId;
    await this.setLoadingState(state, true);
    state.button.disabled = true;
    state.button.setAttribute('aria-busy', 'true');
    this.scheduleLayout();

    try {
      const settings = await settingsStorage.getValue();
      debug('overlay: paraphrase start', {
        field: state.positionKey,
        textLength: text.length,
        modelId: BUNDLED_MODEL_ID,
        storedModelId: settings.modelId,
      });
      debugVerbose('overlay: paraphrase input', text);
      const result = await paraphraseText(text, BUNDLED_MODEL_ID);
      if (state.requestId === requestId) {
        debug('overlay: paraphrase applied', { outputLength: result.length });
        debugVerbose('overlay: paraphrase output', result);
        state.originalText = text;
        state.applying = true;
        applyOutput(field, result);
        state.controls.classList.add('expanded');
        this.scheduleLayout();
      } else {
        debug('overlay: paraphrase stale result dropped', { requestId, field: state.positionKey });
      }
    } catch (cause) {
      if (state.requestId === requestId) {
        if (isExtensionContextInvalidated(cause)) {
          debug('overlay: paraphrase context invalidated');
          this.stop();
          return;
        }

        const message = cause instanceof Error ? cause.message : 'Unable to paraphrase text.';
        debug('overlay: paraphrase failed', message);
        state.button.title = message;
      }
    } finally {
      if (state.requestId === requestId) {
        await this.setLoadingState(state, false);
        state.button.disabled = false;
        state.button.removeAttribute('aria-busy');
        this.scheduleLayout();
      }
    }
  }

  private cancelParaphrase(state: FieldState): void {
    debug('overlay: paraphrase cancelled', state.positionKey);
    state.requestId += 1;
    state.applying = false;
    state.suppressClick = false;
    void this.setLoadingState(state, false);
    state.button.disabled = false;
    state.button.removeAttribute('aria-busy');
    state.controls.classList.remove('expanded');
    this.scheduleLayout();
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

function getPageKey(): string {
  try {
    const url = new URL(location.href);
    url.hash = '';
    return url.toString();
  } catch {
    return location.href.split('#')[0] ?? location.href;
  }
}

function getFieldKey(field: HTMLElement, index: number): string {
  const identifyingAttribute = ['id', 'name', 'aria-label', 'placeholder', 'data-placeholder']
    .map((attribute) => [attribute, field.getAttribute(attribute)] as const)
    .find(([, value]) => value?.trim());

  if (identifyingAttribute) {
    return `${field.tagName.toLowerCase()}:${identifyingAttribute[0]}:${identifyingAttribute[1]}`;
  }

  return `${field.tagName.toLowerCase()}:index:${index}`;
}

function isExtensionContextInvalidated(cause: unknown): boolean {
  return cause instanceof Error && cause.message.includes('Extension context invalidated');
}
