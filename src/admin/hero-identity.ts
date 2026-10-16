import type { Hero } from '../data/types';
import { HEROES } from '../data/heroes';
import { ORIGINS, ROLES } from '../data/traits';
import { esc, input } from './html';

/** Original identities stay protected; database additions can be customized without code. */
export function heroIdentityEditor(hero: Hero, index: number) {
  const select = (
    key: 'origin' | 'role' | 'weapon',
    label: string,
    options: Record<string, { name: string }>,
  ) =>
    `<label>${esc(label)}<select data-path="heroes.${index}.${key}">${Object.entries(options)
      .map(
        ([id, option]) =>
          `<option value="${id}" ${hero[key] === id ? 'selected' : ''}>${esc(option.name)}</option>`,
      )
      .join('')}</select></label>`;
  const original = HEROES.some((h) => h.id === hero.id);
  return `<div class="form-grid">${original ? '' : input(`heroes.${index}.name`, 'Tên tướng', hero.name, 'text')}${input(`heroes.${index}.title`, 'Danh hiệu', hero.title, 'text')}${original ? '' : select('origin', 'Tộc', ORIGINS) + select('role', 'Hệ', ROLES) + select('weapon', 'Vũ khí', { sword: { name: 'Kiếm' }, bow: { name: 'Cung' }, staff: { name: 'Pháp trượng' }, hammer: { name: 'Búa' }, daggers: { name: 'Song đao' } })}</div>`;
}
