interface ZoomView {
  zoomBy(factor: number, x?: number, y?: number): void;
  resetZoom(): void;
}
interface GestureEnvironment {
  document?: EventTarget & { readonly hidden?: boolean };
  window?: EventTarget;
  now?: () => number;
}

/** Interrupted and multi-finger gestures must never become a deployment tap. */
export class ArenaGestures {
  private lifetime = new AbortController();
  private pointers = new Map<number, { x: number; y: number }>();
  private quarantined = new Set<number>();
  private distance = 0;
  private pinched = false;
  private suppressUntil = 0;
  private now: () => number;
  get suppressClick() {
    return this.pinched || this.quarantined.size > 0 || this.now() < this.suppressUntil;
  }
  constructor(
    private canvas: HTMLCanvasElement,
    view: ZoomView,
    enabled: () => boolean,
    private onCancel: () => void,
    environment: GestureEnvironment = {},
  ) {
    this.now = environment.now ?? (() => performance.now());
    const documentSurface = environment.document ?? (typeof document !== 'undefined' ? document : undefined);
    const windowSurface = environment.window ?? (typeof window !== 'undefined' ? window : undefined);
    const options = { signal: this.lifetime.signal };
    canvas.addEventListener(
      'wheel',
      (event) => {
        if (!enabled() || this.quarantined.size || this.pinched) return;
        event.preventDefault();
        const delta =
          event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
        if (Number.isFinite(delta))
          view.zoomBy(Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.002), event.clientX, event.clientY);
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (!enabled() || event.pointerType !== 'touch' || this.pointers.has(event.pointerId)) return;
        if (this.quarantined.size) {
          this.quarantined.add(event.pointerId);
          return;
        }
        if (![event.clientX, event.clientY].every(Number.isFinite)) return;
        const resumingPinch = this.pinched && this.pointers.size < 2;
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size > 2 || resumingPinch) {
          this.cancel();
          return;
        }
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          this.cancel();
          return;
        }
        if (this.pointers.size === 2) {
          this.pinched = true;
          const [a, b] = [...this.pointers.values()];
          this.distance = Math.hypot(a.x - b.x, a.y - b.y);
          this.onCancel();
        }
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        if (!this.pointers.has(event.pointerId)) return;
        if (!enabled()) {
          this.cancel();
          return;
        }
        if (![event.clientX, event.clientY].every(Number.isFinite)) return;
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (this.pointers.size !== 2) return;
        const [a, b] = [...this.pointers.values()];
        const next = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.distance > 8 && next > 8)
          view.zoomBy(next / this.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.distance = next;
      },
      options,
    );
    const release = (event: Event) => {
      const id = (event as PointerEvent).pointerId;
      if (this.quarantined.delete(id)) this.suppressUntil = this.now() + 450;
      if (!this.pointers.delete(id)) return;
      this.releaseCapture(id);
      if (this.pinched) this.suppressUntil = this.now() + 450;
      if (!this.pointers.size) {
        this.pinched = false;
        this.distance = 0;
      }
    };
    const interrupt = (event: Event) => {
      const id = (event as PointerEvent).pointerId;
      if (this.pointers.has(id)) this.cancel();
      release(event);
    };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', interrupt, options);
    canvas.addEventListener(
      'lostpointercapture',
      (event) => {
        if (this.pointers.has(event.pointerId)) this.cancel();
      },
      options,
    );
    // Capture may have been lost over a HUD button; retire its physical release there too.
    documentSurface?.addEventListener(
      'pointerdown',
      (event) => {
        const pointer = event as PointerEvent;
        if (
          pointer.pointerType !== 'touch' ||
          pointer.target === canvas ||
          this.pointers.has(pointer.pointerId)
        )
          return;
        if (this.pointers.size || this.quarantined.size) {
          this.quarantined.add(pointer.pointerId);
          this.cancel();
        }
      },
      { ...options, capture: true },
    );
    documentSurface?.addEventListener('pointerup', release, { ...options, capture: true });
    documentSurface?.addEventListener('pointercancel', interrupt, { ...options, capture: true });
    documentSurface?.addEventListener(
      'visibilitychange',
      () => {
        if (documentSurface.hidden) this.resetPointers();
      },
      options,
    );
    windowSurface?.addEventListener('blur', () => this.resetPointers(), options);
    windowSurface?.addEventListener('pagehide', () => this.resetPointers(), options);
  }
  private releaseCapture(id: number) {
    try {
      if (this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
    } catch {
      /* Browser capture can already be gone after an interruption. */
    }
  }
  cancel() {
    if (!this.pointers.size) return;
    const ids = [...this.pointers.keys()];
    for (const id of ids) this.quarantined.add(id);
    this.pointers.clear();
    this.pinched = false;
    this.distance = 0;
    this.suppressUntil = this.now() + 450;
    for (const id of ids) this.releaseCapture(id);
    this.onCancel();
  }
  private resetPointers() {
    this.cancel();
    if (this.quarantined.size) this.suppressUntil = this.now() + 450;
    this.quarantined.clear();
  }
  dispose() {
    this.resetPointers();
    this.lifetime.abort();
  }
}
