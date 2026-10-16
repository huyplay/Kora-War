/** Decorative card stays above the finger; targeting still uses the original screen coordinates. */
export function dragPreviewPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(8, Math.min(Math.max(8, width - 78), x - 35)),
    y: Math.max(8, Math.min(Math.max(8, height - 96), y - 116)),
  };
}
export class DragPreview {
  private id?: string;
  constructor(private host: HTMLElement) {
    host.setAttribute('aria-hidden', 'true');
  }
  show(
    card: { id: string; art: string; cost: number; valid: boolean },
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (this.id !== card.id) {
      this.id = card.id;
      this.host.innerHTML = `<div class="drag-preview-art">${card.art}</div><b class="drag-preview-cost"></b><b class="drag-preview-state"></b>`;
    }
    this.host.hidden = false;
    this.host.dataset.valid = String(card.valid);
    const cost = this.host.querySelector<HTMLElement>('.drag-preview-cost')!,
      state = this.host.querySelector<HTMLElement>('.drag-preview-state')!;
    if (cost.textContent !== String(card.cost)) cost.textContent = String(card.cost);
    if (state.textContent !== (card.valid ? '✓' : '×')) state.textContent = card.valid ? '✓' : '×';
    const p = dragPreviewPosition(x, y, width, height);
    this.host.style.transform = `translate(${p.x}px,${p.y}px)`;
  }
  hide() {
    this.host.hidden = true;
    this.host.removeAttribute('data-valid');
  }
}
