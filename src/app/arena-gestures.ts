interface ZoomView {
  zoomBy(factor: number, x?: number, y?: number): void;
  resetZoom(): void;
}

/** Two-finger gestures must never become a spell tap when either finger lifts. */
export class ArenaGestures {
  private lifetime = new AbortController();
  private pointers = new Map<number, { x: number; y: number }>();
  private distance = 0;
  private pinched = false;
  private suppressUntil = 0;
  get suppressClick() {
    return this.pinched || performance.now() < this.suppressUntil;
  }
  constructor(canvas: HTMLCanvasElement, view: ZoomView, enabled: () => boolean, cancel: () => void) {
    const options = { signal: this.lifetime.signal };
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!enabled()) return;
        e.preventDefault();
        const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1);
        view.zoomBy(Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.002), e.clientX, e.clientY);
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (!enabled() || e.pointerType !== 'touch') return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture(e.pointerId);
        if (this.pointers.size === 2) {
          this.pinched = true;
          cancel();
          const [a, b] = [...this.pointers.values()];
          this.distance = Math.hypot(a.x - b.x, a.y - b.y);
        }
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size !== 2 || !enabled()) return;
        const [a, b] = [...this.pointers.values()];
        const next = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.distance > 8 && next > 8)
          view.zoomBy(next / this.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.distance = next;
      },
      options,
    );
    const release = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pinched) this.suppressUntil = performance.now() + 450;
      if (!this.pointers.size) {
        this.pinched = false;
        this.distance = 0;
      }
    };
    canvas.addEventListener('pointerup', release, options);
    canvas.addEventListener('pointercancel', release, options);
    canvas.addEventListener('lostpointercapture', release, options);
  }
  dispose() {
    this.lifetime.abort();
    this.pointers.clear();
  }
}
