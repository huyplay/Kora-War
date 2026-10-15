import { $ } from './dom';
let modalRestore: HTMLElement | null = null;
let cleanups: (() => void)[] = [];
export function ownModal(cleanup: () => void) {
  cleanups.push(cleanup);
}
function clear() {
  for (const cleanup of cleanups.splice(0)) cleanup();
}
export function modal(html: string, wide = false) {
  clear();
  $('#hero-tooltip').hidden = true;
  modalRestore = document.activeElement as HTMLElement;
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">${html}</section></div>`;
  $('.modal').focus({ preventScroll: true });
}
export function closeModal() {
  clear();
  $('#modal-root').innerHTML = '';
  if (modalRestore?.isConnected) modalRestore.focus({ preventScroll: true });
}
