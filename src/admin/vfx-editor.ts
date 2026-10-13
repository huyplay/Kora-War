import { VFX_EVENTS } from '../data/media';
import { esc, input } from './html';
import type { State } from './types';

export function eventVfxEditor(state: State) {
  const labels = { spawn: 'Gọi quân', skill: 'Kỹ năng', heal: 'Hồi máu', death: 'Chết', pulse: 'Cộng hưởng' };
  const images = state.assets.filter((asset) => asset.kind === 'image' && !asset.archived);
  return `<article class="panel"><h3>Hiệu ứng theo sự kiện</h3>${VFX_EVENTS.map((event) => {
    const binding = state.draft.vfx.eventSprites?.[event];
    return `<div class="prop-row"><b>${labels[event]}</b><label>Atlas<select data-vfx-event="${event}"><option value="">Dùng atlas chung</option>${images.map((asset) => `<option value="${asset.id}" ${binding?.assetId === asset.id ? 'selected' : ''}>${esc(asset.name)}</option>`).join('')}</select></label>${binding ? `${input(`vfx.eventSprites.${event}.columns`, 'Cột', binding.columns)}${input(`vfx.eventSprites.${event}.rows`, 'Hàng', binding.rows)}${input(`vfx.eventSprites.${event}.fps`, 'FPS atlas', binding.fps)}` : ''}</div>`;
  }).join(
    '',
  )}<p class="muted">Sheet được kiểm tra kích thước trước khi phát hành. FPS atlas chỉ điều khiển hình ảnh.</p></article>`;
}
