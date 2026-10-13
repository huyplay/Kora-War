export const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function input(path: string, label: string, value: unknown, type = 'number', extra = '') {
  return `<label>${esc(label)}<input data-path="${esc(path)}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'step="any"' : ''} ${extra}></label>`;
}
