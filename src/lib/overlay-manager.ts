import { collectTextFields } from './text-fields';

const HOST_ID = 'aicamouflage-overlay-host';

export class TextFieldOverlayManager {
  private readonly logoUrl: string;
  private readonly markers = new Map<HTMLElement, HTMLImageElement>();
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
        marker.remove();
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
        position: fixed;
        display: block;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.45));
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

    const marker = document.createElement('img');
    marker.className = 'logo';
    marker.alt = '';
    marker.src = this.logoUrl;
    marker.width = this.logoSize;
    marker.height = this.logoSize;
    this.layer.append(marker);
    this.markers.set(field, marker);
    this.resizeObserver.observe(field);
  }

  private clearMarkers(): void {
    for (const [field, marker] of this.markers) {
      marker.remove();
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

    for (const [field, marker] of this.markers) {
      const rect = field.getBoundingClientRect();
      const fits = rect.width >= size + inset * 2 && rect.height >= size;
      const inViewport =
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;

      if (!fits || !inViewport) {
        marker.style.display = 'none';
        continue;
      }

      marker.style.display = 'block';
      marker.style.width = `${size}px`;
      marker.style.height = `${size}px`;
      marker.style.top = `${rect.top + (rect.height - size) / 2}px`;
      marker.style.left = `${rect.right - size - inset}px`;
    }
  }
}
