interface DragState {
    id: string;
    pointerId: number;
    x: number;
    y: number;
    active: boolean;
    target: HTMLElement;
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
    private lifetime = new AbortController();
    constructor(private callbacks: GestureCallbacks) {
        const options = { signal: this.lifetime.signal };
        document.addEventListener('pointermove', e => this.move(e), options);
        document.addEventListener('pointerup', e => this.finish(e, false), options);
        document.addEventListener('pointercancel', e => this.finish(e, true), options);
        window.addEventListener('blur', () => this.cancel(), options);
    }
    get active(): boolean { return this.drag?.active ?? false; }
    get suppressClick(): boolean { return performance.now() < this.blockedClickUntil; }
    begin(event: PointerEvent, id: string): void {
        if (this.drag || !event.isPrimary || event.button !== 0 || !this.callbacks.canStart(id))
            return;
        const target = event.currentTarget as HTMLElement;
        this.drag = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false, target };
        target.setPointerCapture?.(event.pointerId);
    }
    private move(event: PointerEvent): void {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId)
            return;
        if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8)
            return;
        drag.active = true;
        this.callbacks.move(drag.id, event.clientX, event.clientY);
    }
    private finish(event: PointerEvent, cancelled: boolean): void {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId)
            return;
        this.drag = null;
        if (drag.target.hasPointerCapture?.(event.pointerId))
            drag.target.releasePointerCapture(event.pointerId);
        if (drag.active) {
            this.blockedClickUntil = performance.now() + 400;
            if (!cancelled)
                this.callbacks.drop(drag.id, event.clientX, event.clientY);
        }
        if (cancelled)
            this.callbacks.cancel();
        this.callbacks.end();
    }
    cancel(): void {
        if (this.drag) {
            const { target, pointerId } = this.drag;
            if (target.hasPointerCapture?.(pointerId))
                target.releasePointerCapture(pointerId);
            this.drag = null;
            this.blockedClickUntil = performance.now() + 400;
            this.callbacks.cancel();
            this.callbacks.end();
        }
    }
    dispose(): void { this.cancel(); this.lifetime.abort(); }
}
