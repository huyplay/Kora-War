import type { ModelBinding } from '../data/content';
import { modelAnimationTiming } from '../data/model-animation';
import { input } from './html';

export function modelAnimationEditor(hero: string, binding?: ModelBinding) {
  const timing = modelAnimationTiming(binding?.animation);
  return `<fieldset><legend>Nhịp hoạt ảnh</legend><p>Thời lượng trình bày, không đổi thời điểm sát thương hoặc hồi chiêu. Clip thiếu vẫn dùng idle.</p><div class="form-grid">${(
    [
      ['attackSeconds', 'Đánh thường (giây)', 0.08, 2],
      ['castSeconds', 'Kỹ năng (giây)', 0.08, 2],
      ['crossFadeSeconds', 'Chuyển clip (giây)', 0, 0.3],
    ] as const
  )
    .map(([key, label, min, max]) =>
      input(`models.${hero}.animation.${key}`, label, timing[key], 'number', `min="${min}" max="${max}"`),
    )
    .join(
      '',
    )}</div><div class="animation-preview-actions" aria-label="Xem thử clip đã gán">${(['idle', 'walk', 'attack', 'cast'] as const).map((state, i) => `<button type="button" data-model-action="${state}">${['Đứng', 'Di chuyển', 'Đánh thường', 'Kỹ năng'][i]}</button>`).join('')}</div></fieldset>`;
}
