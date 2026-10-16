import type { ContentConfig } from '../data/content';
import { VFX_EVENTS, type VfxEvent } from '../data/media';
import { input } from './html';

export function vfxReadabilityEditor(content: ContentConfig) {
  const p = content.vfx.readability;
  if (!p)
    return '<article class="panel"><h3>Độ rõ giao chiến</h3><button id="add-vfx-readability">+ Cấu hình độ rõ hiệu ứng</button></article>';
  const labels: Record<VfxEvent, string> = {
    spawn: 'Triệu hồi',
    skill: 'Kỹ năng',
    heal: 'Hồi máu',
    death: 'Hạ gục',
    pulse: 'Cộng hưởng',
    hit: 'Trúng đòn',
    projectile: 'Đạn atlas',
  };
  return `<article class="panel"><h3>Độ rõ giao chiến</h3><p>Giới hạn lớp sáng để giữ rõ tướng trên mobile. Chỉ điều chỉnh hình ảnh; sát thương và thời gian hiệu lực giữ theo luật trận.</p><div class="form-grid">${[
    input('vfx.readability.maxPerArea', 'Số atlas tối đa mỗi vùng', p.maxPerArea),
    input('vfx.readability.areaRadius', 'Bán kính vùng giới hạn', p.areaRadius),
    input('vfx.readability.maxDuration', 'Thời gian atlas tối đa (s)', p.maxDuration),
  ].join('')}</div><h4>Atlas theo sự kiện</h4>${VFX_EVENTS.map((event) => {
    const style = p.events[event];
    const path = `vfx.readability.events.${event}`;
    return `<div class="prop-row"><b>${labels[event]}</b>${input(`${path}.opacity`, 'Độ rõ (0–1)', style.opacity)}${input(`${path}.scale`, 'Tỷ lệ kích thước', style.scale)}${input(`${path}.cooldown`, 'Giãn nhịp cùng tướng/vị trí (s)', style.cooldown)}<label>Trộn màu<select data-path="${path}.blend"><option value="normal" ${style.blend === 'normal' ? 'selected' : ''}>Thông thường</option><option value="additive" ${style.blend === 'additive' ? 'selected' : ''}>Cộng sáng</option></select></label></div>`;
  }).join(
    '',
  )}<h4>Vệt chém cận chiến</h4><label><input type="checkbox" data-bool="vfx.readability.melee.enabled" ${p.melee.enabled ? 'checked' : ''}> Hiện vệt chém</label><div class="form-grid">${[
    input('vfx.readability.melee.size', 'Tỷ lệ vệt chém', p.melee.size),
    input('vfx.readability.melee.opacity', 'Độ rõ vệt chém (0–1)', p.melee.opacity),
    input('vfx.readability.melee.lifetime', 'Thời gian vệt chém (s)', p.melee.lifetime),
    input('vfx.readability.melee.heightRatio', 'Độ cao theo thân tướng', p.melee.heightRatio),
  ].join('')}</div></article>`;
}
