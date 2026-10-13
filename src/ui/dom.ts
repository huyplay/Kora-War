export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
export const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
