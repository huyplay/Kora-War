import type { ContentConfig } from '../data/content';
import { esc, input } from './html';
const kinds = { damage: 'Sát thương', heal: 'Hồi máu', shield: 'Lá chắn', slow: 'Làm chậm', stun: 'Choáng' };
const targets = {
  self: 'Bản thân',
  nearEnemies: 'Địch gần',
  allies: 'Đồng minh',
  areaEnemies: 'Địch trong vùng',
};
function select(path: string, label: string, value: string, options: Record<string, string>) {
  return `<label>${label}<select data-path="${path}">${Object.entries(options)
    .map(([id, name]) => `<option value="${id}" ${value === id ? 'selected' : ''}>${name}</option>`)
    .join('')}</select></label>`;
}
export function abilityEditor(c: ContentConfig, hero: string) {
  const ability = c.abilities[hero],
    prefix = `abilities.${hero}`;
  return `<div class="form-grid">${select(`${prefix}.trigger`, 'Kích hoạt khi', ability.trigger, { enemy: 'Có địch', enemyOrAlly: 'Có địch hoặc đồng minh', woundedAllies: 'Đồng minh thiếu máu' })}${input(`${prefix}.missingHp`, 'Máu thiếu tối thiểu', ability.missingHp ?? '')}</div><div class="section-title"><h3>Chuỗi hiệu ứng</h3><button id="add-effect">+ Hiệu ứng</button></div>${ability.effects
    .map((effect, i) => {
      const p = `${prefix}.effects.${i}`;
      return `<div class="effect-editor"><div class="section-title"><span class="eyebrow">EFFECT 0${i + 1}</span><button data-remove-effect="${i}" aria-label="Xóa hiệu ứng ${i + 1}">×</button></div><div class="form-grid rules-grid">${select(`${p}.kind`, 'Loại', effect.kind, kinds)}${select(`${p}.targets.group`, 'Mục tiêu', effect.targets.group, targets)}${input(`${p}.amount`, effect.kind === 'slow' ? 'Hệ số tốc độ (0–1)' : 'Giá trị', effect.amount)}${input(`${p}.duration`, 'Thời lượng (s)', effect.duration ?? '')}${input(`${p}.targets.radius`, 'Bán kính (m)', effect.targets.radius ?? '')}${input(`${p}.targets.limit`, 'Số mục tiêu tối đa', effect.targets.limit ?? '')}${input(`${p}.cap`, 'Giới hạn lá chắn', effect.cap ?? '')}${select(`${p}.targets.order`, 'Ưu tiên', effect.targets.order || '', { '': 'Mặc định', health: 'Máu thấp', healthRatio: 'Tỷ lệ máu thấp' })}<label class="checkbox"><input type="checkbox" data-bool="${p}.targets.excludeSelf" ${effect.targets.excludeSelf ? 'checked' : ''}> Loại trừ bản thân</label><label class="checkbox"><input type="checkbox" data-bool="${p}.targets.woundedOnly" ${effect.targets.woundedOnly ? 'checked' : ''}> Chỉ tướng thiếu máu</label></div></div>`;
    })
    .join(
      '',
    )}<details><summary class="muted">Dữ liệu kỹ năng nâng cao</summary><textarea data-json="${prefix}" spellcheck="false" rows="14">${esc(JSON.stringify(ability, null, 2))}</textarea></details>`;
}
