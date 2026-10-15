/** Persistent DOM keeps regeneration transitions alive instead of rebuilding every HUD tick. */
export class ManaDisplay {
  private cells: HTMLElement[] = [];
  private previous = 0;
  constructor(
    private root: HTMLElement,
    private track: HTMLElement,
    private amount: HTMLElement,
  ) {
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Mana');
    track.setAttribute('aria-valuemin', '0');
  }
  update(value: number, max: number) {
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
    if (value < this.previous - 0.5 && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      this.amount.animate(
        [
          { transform: 'scale(1.22)', filter: 'brightness(1.8)' },
          { transform: 'scale(1)', filter: 'brightness(1)' },
        ],
        { duration: 320, easing: 'ease-out' },
      );
    this.previous = value;
  }
}
