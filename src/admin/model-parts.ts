import { esc } from './html';

export function modelPartsEditor(names: string[], hidden: readonly string[] = []) {
  const parts = [...new Set([...names, ...hidden])].sort();
  return `<legend>Phần hiển thị của model</legend><p>Bỏ chọn đạo cụ hoặc thú phụ. Không thay đổi kỹ năng và va chạm.</p>${parts.length ? parts.map((name) => `<label><input type="checkbox" data-model-part="${esc(name)}" ${hidden.includes(name) ? '' : 'checked'}> Hiển thị ${esc(name)}${names.includes(name) ? '' : ' (không có trong model)'}</label>`).join('') : '<p>Model không có phần được đặt tên.</p>'}`;
}
