import { communicationOf } from '../data/communication';
import { presentationOf } from '../data/presentation';
import type { ContentConfig } from '../data/content';
import { esc, input } from './html';
import type { ManagedAsset } from '../services/api';
export function communicationEditor(c: ContentConfig, assets: ManagedAsset[] = []) {
  const chat = communicationOf(c),
    formation = presentationOf(c).formation;
  const image = (index: number, value?: string) =>
    `<label>Hình emoji<select data-path="communication.reactions.${index}.imageAssetId"><option value="">Emoji mặc định</option>${assets
      .filter((a) => a.kind === 'image' && !a.archived)
      .map((a) => `<option value="${esc(a.id)}" ${a.id === value ? 'selected' : ''}>${esc(a.name)}</option>`)
      .join('')}</select></label>`;
  return `<article class="panel"><h3>Emoji & chat nhanh</h3><p class="muted">PvP chỉ gửi ID phản hồi trong danh sách đã phát hành. Luyện tập hiển thị phản hồi của chính người chơi.</p><label class="checkbox"><input type="checkbox" data-bool="communication.enabled" ${chat.enabled ? 'checked' : ''}>Bật chat nhanh</label><div class="form-grid">${input('communication.cooldownSeconds', 'Khoảng gửi tối thiểu (s)', chat.cooldownSeconds)}${input('communication.displaySeconds', 'Hiển thị bong bóng (s)', chat.displaySeconds)}${input('communication.maxPerMatch', 'Giới hạn mỗi người/trận', chat.maxPerMatch)}</div><div class="reaction-edit-grid">${chat.reactions.map((r, i) => `<div class="effect-editor"><strong>${esc(r.text)}</strong><div class="form-grid">${input(`communication.reactions.${i}.text`, r.kind === 'emoji' ? 'Emoji' : 'Câu soạn sẵn', r.text, 'text')}${input(`communication.reactions.${i}.label`, 'Tên hiển thị', r.label, 'text')}${image(i, r.imageAssetId)}</div><label class="checkbox"><input type="checkbox" data-bool="communication.reactions.${i}.enabled" ${r.enabled ? 'checked' : ''}>Cho phép dùng</label></div>`).join('')}</div></article><article class="panel"><h3>Đội hình hiển thị · chống chồng lấn</h3><p class="muted">Giãn vị trí model trong lane; không đổi tọa độ, tầm đánh hoặc sát thương mô phỏng. Hit, VFX, bóng và chọn quân bám vị trí hiển thị.</p><label class="checkbox"><input type="checkbox" data-bool="presentation.formation.enabled" ${formation.enabled ? 'checked' : ''}>Bật giãn đội hình</label><div class="form-grid">${Object.entries(
    formation,
  )
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) =>
      input(
        `presentation.formation.${k}`,
        (
          {
            radius: 'Bán kính quân (m)',
            laneRows: 'Số hàng trong lane',
            spacing: 'Khoảng cách thêm (m)',
            smoothing: 'Tốc độ làm mượt',
            modelScale: 'Tỷ lệ model',
          } as Record<string, string>
        )[k],
        v,
      ),
    )
    .join('')}</div></article>`;
}
