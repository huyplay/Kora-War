export function pageWindow(count: number, size: number, page: number) {
  const pages = Math.max(1, Math.ceil(count / size)),
    current = Math.max(0, Math.min(pages - 1, page));
  return { page: current, pages, start: current * size, end: Math.min(count, (current + 1) * size) };
}
/** Explicit pages with horizontal swipes. Never scrolls a document or clips inaccessible cards. */
export function pageDeck(root: HTMLElement, size: number, label: string) {
  const items = Array.from(root.children) as HTMLElement[],
    nav = document.createElement('nav');
  nav.className = 'page-controls';
  nav.setAttribute('aria-label', label);
  nav.innerHTML = `<button type="button" aria-label="Trang trước · ${label}">‹</button><span role="status"></span><button type="button" aria-label="Trang sau · ${label}">›</button>`;
  root.after(nav);
  root.classList.add('paged-content');
  const [previous, next] = Array.from(nav.querySelectorAll('button')),
    status = nav.querySelector('span')!;
  const lifetime = new AbortController();
  let page = 0,
    drag: { id: number; x: number; y: number; active: boolean } | undefined,
    suppress = 0;
  function releaseDrag() {
    const id = drag?.id;
    drag = undefined;
    if (id !== undefined && root.hasPointerCapture(id)) root.releasePointerCapture(id);
  }
  function show(value: number) {
    const range = pageWindow(items.length, size, value);
    page = range.page;
    items.forEach((el, i) => (el.hidden = i < range.start || i >= range.end));
    previous.disabled = !page;
    next.disabled = page >= range.pages - 1;
    status.textContent = `${page + 1} / ${range.pages}`;
    nav.hidden = range.pages === 1;
  }
  previous.onclick = () => show(page - 1);
  next.onclick = () => show(page + 1);
  root.addEventListener(
    'pointerdown',
    (e) => {
      if (!drag && e.isPrimary && e.button === 0)
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false };
    },
    { signal: lifetime.signal },
  );
  root.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (!drag.active) {
          drag.active = true;
          root.setPointerCapture(e.pointerId);
        }
        e.preventDefault();
      }
    },
    { signal: lifetime.signal, passive: false },
  );
  root.addEventListener(
    'pointerup',
    (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag;
      releaseDrag();
      if (d.active) {
        suppress = performance.now() + 400;
        if (Math.abs(e.clientX - d.x) > 48) show(page + (e.clientX < d.x ? 1 : -1));
      }
    },
    { signal: lifetime.signal },
  );
  const cancel = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.active) suppress = performance.now() + 400;
    releaseDrag();
  };
  root.addEventListener('pointercancel', cancel, { signal: lifetime.signal });
  root.addEventListener(
    'lostpointercapture',
    (e) => {
      // Touch starts with implicit capture on the card. Transferring it to the
      // paging surface bubbles the card's loss here; that is not a cancelled swipe.
      if (e.target === root) cancel(e);
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
  show(0);
  return {
    show,
    get page() {
      return page;
    },
    dispose: () => {
      lifetime.abort();
      releaseDrag();
      nav.remove();
    },
  };
}
