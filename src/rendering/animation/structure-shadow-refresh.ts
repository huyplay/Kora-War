/** Refresh cached structure shadows only while they change, at most 12 Hz in motion. */
export class StructureShadowRefresh {
  private pending = false;
  private cooldown = 0;
  update(changed: boolean, dt: number, enabled: boolean) {
    this.pending ||= changed;
    this.cooldown = Math.max(0, this.cooldown - Math.max(0, dt));
    if (!enabled || !this.pending || (this.cooldown > 0 && dt > 0)) return false;
    // Flush the last pose on pause, rather than leaving a stale tall shadow on ruins.
    this.pending = false;
    this.cooldown = 1 / 12;
    return true;
  }
  reset() {
    this.pending = false;
    this.cooldown = 0;
  }
}
