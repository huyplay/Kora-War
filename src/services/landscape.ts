/** Browsers may deny orientation lock; a portrait gate guarantees landscape-only play. */
export class LandscapeController {
    private query = matchMedia('(orientation: portrait)');
    private lifetime = new AbortController();
    private overlay: HTMLDivElement;
    constructor(private onPortrait: () => void) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'orientation-gate';
        this.overlay.innerHTML = '<div class="rotate-device" aria-hidden="true">↻</div><h1>KORA WAR</h1><p>Xoay ngang để chiến đấu</p><button class="primary" id="rotate-fullscreen">⛶ Toàn màn hình</button>';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-label', 'Xoay ngang thiết bị');
        document.body.appendChild(this.overlay);
        this.overlay.querySelector('button')!.addEventListener('click', () => void this.fullscreen(), { signal: this.lifetime.signal });
        this.query.addEventListener('change', () => this.update(), { signal: this.lifetime.signal });
        this.update();
    }
    get blocked(): boolean { return this.query.matches; }
    private update(): void {
        const blocked = this.blocked;
        this.overlay.hidden = !blocked;
        document.getElementById('app')!.inert = blocked;
        document.body.classList.toggle('portrait-blocked', blocked);
        if (blocked)
            this.onPortrait();
    }
    async fullscreen(): Promise<void> {
        try {
            if (!document.fullscreenElement)
                await document.documentElement.requestFullscreen?.();
            const orientation = screen.orientation as ScreenOrientation & {
                lock?: (mode: string) => Promise<void>;
            };
            await orientation?.lock?.('landscape');
        }
        catch { /* Keep the portrait gate when fullscreen/locking is unsupported or denied. */ }
    }
    dispose(): void { this.lifetime.abort(); this.overlay.remove(); document.getElementById('app')?.removeAttribute('inert'); document.body.classList.remove('portrait-blocked'); }
}
