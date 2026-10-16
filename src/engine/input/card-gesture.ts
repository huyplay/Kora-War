interface DragState {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  active: boolean;
  target: HTMLElement;
  touch: boolean;
}
export interface GestureCallbacks {
  canStart(id: string): boolean;
  move(id: string, x: number, y: number): void;
  drop(id: string, x: number, y: number): void;
  cancel(): void;
  end(): void;
}
/** One primary pointer owns the gesture. Capture retains drags outside the card. */
export class CardGesture {
  private drag: DragState | null = null;
  private blockedClickUntil = 0;
  private touches = new Set<number>();
  // A timer alone expires while the other finger is still held on the screen.
  private quarantined = new Set<number>();
  private lifetime = new AbortController();
  constructor(private callbacks: GestureCallbacks) {
    const options = { signal: this.lifetime.signal };
    document.addEventListener('pointerdown', (e) => this.pointerDown(e), { ...options, capture: true });
    document.addEventListener('pointermove', (e) => this.move(e), options);
    document.addEventListener('pointerup', (e) => this.finish(e, false), options);
    document.addEventListener('pointercancel', (e) => this.finish(e, true), options);
    document.addEventListener(
      'lostpointercapture',
      (e) => {
        if (e.pointerId === this.drag?.pointerId) this.cancel();
      },
      { ...options, capture: true },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.resetPointers();
      },
      options,
    );
    window.addEventListener('blur', () => this.resetPointers(), options);
  }
  get active(): boolean {
    return this.drag?.active ?? false;
  }
  get suppressClick(): boolean {
    return this.quarantined.size > 0 || performance.now() < this.blockedClickUntil;
  }
  begin(event: PointerEvent, id: string): boolean {
    if (
      this.lifetime.signal.aborted ||
      this.drag ||
      this.quarantined.size ||
      !event.isPrimary ||
      event.button !== 0 ||
      !this.callbacks.canStart(id)
    )
      return false;
    const touch = event.pointerType === 'touch';
    if (touch && [...this.touches].some((pointerId) => pointerId !== event.pointerId)) return false;
    const target = event.currentTarget as HTMLElement;
    this.drag = {
      id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: false,
      target,
      touch,
    };
    if (touch) this.touches.add(event.pointerId);
    try {
      target.setPointerCapture?.(event.pointerId);
    } catch {
      this.cancel();
      return false;
    }
    return this.drag?.pointerId === event.pointerId;
  }
  private pointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    this.touches.add(event.pointerId);
    if (this.quarantined.size || (this.drag?.touch && event.pointerId !== this.drag.pointerId)) {
      for (const pointerId of this.touches) this.quarantined.add(pointerId);
      this.cancel();
    }
  }
  private move(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!this.callbacks.canStart(drag.id)) {
      this.cancel();
      return;
    }
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    drag.active = true;
    this.callbacks.move(drag.id, event.clientX, event.clientY);
  }
  private finish(event: PointerEvent, cancelled: boolean): void {
    this.touches.delete(event.pointerId);
    if (this.quarantined.delete(event.pointerId)) this.blockedClickUntil = performance.now() + 400;
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.drag = null;
    this.releaseCapture(drag);
    cancelled ||= !this.callbacks.canStart(drag.id);
    if (drag.active || cancelled) {
      this.blockedClickUntil = performance.now() + 400;
    }
    try {
      if (cancelled) this.callbacks.cancel();
      else if (drag.active) this.callbacks.drop(drag.id, event.clientX, event.clientY);
    } finally {
      this.callbacks.end();
    }
  }
  cancel(): void {
    if (this.drag) {
      const drag = this.drag;
      this.drag = null;
      if (drag.touch) this.quarantined.add(drag.pointerId);
      this.releaseCapture(drag);
      this.blockedClickUntil = performance.now() + 400;
      try {
        this.callbacks.cancel();
      } finally {
        this.callbacks.end();
      }
    }
  }
  private releaseCapture(drag: DragState): void {
    // Capture can already be gone after browser cancellation or DOM removal.
    try {
      if (drag.target.hasPointerCapture?.(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    } catch {
      /* The gesture has already been detached from its owner. */
    }
  }
  private resetPointers(): void {
    this.cancel();
    if (this.quarantined.size) this.blockedClickUntil = performance.now() + 400;
    this.touches.clear();
    this.quarantined.clear();
  }
  dispose(): void {
    this.resetPointers();
    this.lifetime.abort();
  }
}
