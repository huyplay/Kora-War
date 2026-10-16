/** Persistent DOM keeps regeneration transitions alive instead of rebuilding every HUD tick. */
export class ManaDisplay {
  private cells: HTMLElement[] = [];
  private previous?: number;
  private animation?: Animation;
  constructor(
    private root: HTMLElement,
    private track: HTMLElement,
    private amount: HTMLElement,
    private reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  ) {
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Mana');
    track.setAttribute('aria-valuemin', '0');
  }
  update(value: number, max: number, feedback = true) {
    const reduced = this.reduced();
    if (!feedback || reduced) this.cancelAnimation();
    value = Math.max(0, Math.min(max, value));
    if (this.cells.length !== max) {
      this.track.innerHTML = Array.from(
        { length: max },
        () => '<span class="mana-gem"><i><b></b></i></span>',
      ).join('');
      this.cells = Array.from(this.track.children) as HTMLElement[];
      this.track.style.setProperty('--mana-slots', String(max));
    }
    this.amount.textContent = String(Math.floor(value));
    this.amount.dataset.max = String(max);
    this.track.setAttribute('aria-valuemax', String(max));
    this.track.setAttribute('aria-valuenow', value.toFixed(2));
    this.root.dataset.state = value >= max ? 'full' : 'charging';
    this.cells.forEach((cell, i) => {
      const fraction = Math.max(0, Math.min(1, value - i));
      cell.classList.toggle('filled', fraction >= 1);
      cell.classList.toggle('filling', fraction > 0 && fraction < 1);
      cell.style.setProperty('--mana-fill', `${fraction * 100}%`);
    });
    if (this.previous !== undefined && value < this.previous - 0.5 && feedback && !reduced) {
      this.cancelAnimation();
      const animation = this.amount.animate(
        [
          { transform: 'scale(1.22)', filter: 'brightness(1.8)' },
          { transform: 'scale(1)', filter: 'brightness(1)' },
        ],
        { duration: 320, easing: 'ease-out' },
      );
      this.animation = animation;
      const release = () => {
        if (this.animation === animation) this.animation = undefined;
      };
      animation.onfinish = animation.oncancel = release;
    }
    this.previous = value;
  }
  private cancelAnimation() {
    const animation = this.animation;
    this.animation = undefined;
    animation?.cancel();
  }
  /** A new match or resumed connection starts from its first displayed snapshot. */
  reset() {
    this.cancelAnimation();
    this.previous = undefined;
  }
  suspend() {
    this.reset();
  }
  dispose() {
    this.reset();
  }
}
