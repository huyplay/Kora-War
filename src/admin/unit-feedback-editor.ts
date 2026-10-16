import type { ContentConfig } from '../data/content';
import { input } from './html';
export function unitFeedbackEditor(content: ContentConfig) {
  const p = content.vfx.feedback;
  if (!p)
    return '<article class="panel"><h3>Phản hồi tướng</h3><button id="add-unit-feedback">+ Cấu hình số và lá chắn</button></article>';
  return `<article class="panel"><h3>Số sát thương và lớp bảo vệ</h3><p>Chỉ điều chỉnh hình ảnh. Màu băng/lá chắn lấy từ Gameplay → Phép; thời gian hiệu lực vẫn theo trạng thái trận.</p>
    <label><input type="checkbox" data-bool="vfx.feedback.numbers.enabled" ${p.numbers.enabled ? 'checked' : ''}> Hiện số sát thương/hồi máu</label>
    <label><input type="checkbox" data-bool="vfx.feedback.bodies.enabled" ${p.bodies.enabled ? 'checked' : ''}> Hiện lớp băng/lá chắn</label>
    <div class="form-grid">${[
      input('vfx.feedback.numbers.pixels', 'Kích thước số (px)', p.numbers.pixels),
      input('vfx.feedback.numbers.lifetime', 'Thời gian số (s)', p.numbers.lifetime),
      input('vfx.feedback.numbers.risePixels', 'Độ bay lên (px)', p.numbers.risePixels),
      input('vfx.feedback.numbers.damageColor', 'Màu số sát thương', p.numbers.damageColor, 'color'),
      input('vfx.feedback.numbers.healColor', 'Màu số hồi máu', p.numbers.healColor, 'color'),
      input('vfx.feedback.bodies.opacity', 'Độ rõ lớp bảo vệ', p.bodies.opacity),
      input('vfx.feedback.bodies.padding', 'Độ nới quanh model', p.bodies.padding),
    ].join('')}</div></article>`;
}
