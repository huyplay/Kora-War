import type { ContentConfig } from '../data/content';
import { defaultCombatPresentation } from '../data/combat-presentation';
import { esc, input } from './html';
export function combatVfxEditor(content: ContentConfig) {
  const c = content.vfx.combat;
  if (!c)
    return '<article class="panel"><h3>Đạn tướng</h3><p>Snapshot này dùng hiệu ứng cũ. Thêm profile để cấu hình đạn tướng cho lần phát hành mới.</p><button id="add-combat-vfx">+ Cấu hình đạn tướng</button></article>';
  const labels = {
    flightSeconds: 'Thời gian bay (s)',
    arcHeight: 'Độ cong quỹ đạo',
    size: 'Kích thước đạn',
    trailLength: 'Độ dài vệt sáng',
    impactSize: 'Kích thước điểm chạm',
    impactSeconds: 'Thời gian điểm chạm (s)',
  };
  const defaults = defaultCombatPresentation(content.heroes);
  return `<article class="panel"><h3>Đạn tướng và điểm chạm</h3><p>Áp dụng cho đòn đánh xa; tầm đánh chỉnh ở Nhân vật. Chỉ điều chỉnh hiển thị. Sát thương vẫn áp dụng theo luật trận, không chờ đạn bay.</p><label><input type="checkbox" data-bool="vfx.combat.enabled" ${c.enabled ? 'checked' : ''}> Bật hiệu ứng đạn tướng</label><div class="form-grid">${Object.entries(
    labels,
  )
    .map(([key, label]) => input(`vfx.combat.${key}`, label, c[key as keyof typeof labels]))
    .join('')}</div><h4>Ngoại hình theo tướng</h4><div class="form-grid">${content.heroes
    .map((hero) => {
      const p = c.heroes[hero.id] ?? defaults.heroes[hero.id];
      return `<label>${esc(hero.name)} · kiểu đạn<select data-path="vfx.combat.heroes.${hero.id}.style">${[
        ['arrow', 'Mũi tên'],
        ['orb', 'Cầu phép'],
        ['bolt', 'Tia năng lượng'],
      ]
        .map(([id, name]) => `<option value="${id}" ${id === p.style ? 'selected' : ''}>${name}</option>`)
        .join(
          '',
        )}</select></label>${input(`vfx.combat.heroes.${hero.id}.color`, `${hero.name} · màu đạn`, p.color, 'color')}`;
    })
    .join('')}</div></article>`;
}
