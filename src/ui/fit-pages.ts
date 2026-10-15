import { pageDeck } from './page-deck';

/** Keep every row reachable when the viewport, safe area or active tab changes. */
export function fitPages(root: HTMLElement, label: string, rowHeight = 48) {
  let size = 1,
    pager = pageDeck(root, size, label);
  const fit = () => {
    if (!root.clientHeight) return; // An inactive tab keeps its own page.
    const next = Math.max(1, Math.floor(root.clientHeight / rowHeight));
    if (size === next) return;
    const anchor = pager.page * size;
    pager.dispose();
    size = next;
    pager = pageDeck(root, size, label);
    pager.show(Math.floor(anchor / size));
  };
  const observer = new ResizeObserver(fit);
  observer.observe(root);
  fit();
  return {
    dispose: () => {
      observer.disconnect();
      pager.dispose();
    },
  };
}
