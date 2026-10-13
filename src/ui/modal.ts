import { $ } from './dom';
let modalRestore: HTMLElement | null = null;
export function modal(html: string, wide = false) { $('#hero-tooltip').hidden = true; modalRestore = document.activeElement as HTMLElement; $('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" tabindex="-1">${html}</section></div>`; $('.modal').focus(); }
export function closeModal() { $('#modal-root').innerHTML = ''; modalRestore?.focus(); }
