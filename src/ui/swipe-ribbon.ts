/** Bounded horizontal dragging never scrolls the document or selects a card. */
export function swipeRibbon(root: HTMLElement, previous: HTMLButtonElement, next: HTMLButtonElement) {
  const lifetime = new AbortController();
  let drag: { id: number; x: number; y: number; start: number; active: boolean } | undefined;
  let suppress = 0;
  const update = () => {
    previous.disabled = root.scrollLeft < 2;
    next.disabled = root.scrollLeft + root.clientWidth >= root.scrollWidth - 2;
  };
  const move = (direction: number) =>
    root.scrollBy({
      left: direction * root.clientWidth * 0.8,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  const release = () => {
    const id = drag?.id;
    drag = undefined;
    if (id !== undefined && root.hasPointerCapture(id)) root.releasePointerCapture(id);
  };
  root.addEventListener(
    'pointerdown',
    (e) => {
      if (e.isPrimary && e.button === 0 && !drag)
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: root.scrollLeft, active: false };
    },
    { signal: lifetime.signal },
  );
  root.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.active && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) {
        drag.active = true;
        root.setPointerCapture(e.pointerId);
      }
      if (drag.active) {
        e.preventDefault();
        root.scrollLeft = drag.start - dx;
      }
    },
    { signal: lifetime.signal, passive: false },
  );
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.active) suppress = performance.now() + 400;
    release();
  };
  root.addEventListener('pointerup', end, { signal: lifetime.signal });
  root.addEventListener('pointercancel', end, { signal: lifetime.signal });
  root.addEventListener(
    'lostpointercapture',
    (e) => {
      if (e.target === root) end(e);
    },
    { signal: lifetime.signal },
  );
  root.addEventListener(
    'click',
    (e) => {
      if (performance.now() < suppress) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    { capture: true, signal: lifetime.signal },
  );
  root.addEventListener('scroll', update, { signal: lifetime.signal, passive: true });
  root.addEventListener(
    'focusin',
    (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.collection-card');
      if (!card) return;
      const box = card.getBoundingClientRect(),
        viewport = root.getBoundingClientRect();
      if (box.left < viewport.left) root.scrollLeft += box.left - viewport.left;
      else if (box.right > viewport.right) root.scrollLeft += box.right - viewport.right;
    },
    { signal: lifetime.signal },
  );
  const observer = new ResizeObserver(update);
  observer.observe(root);
  update();
  return {
    refresh: update,
    dispose: () => {
      lifetime.abort();
      observer.disconnect();
      release();
      previous.onclick = next.onclick = null;
    },
  };
}
