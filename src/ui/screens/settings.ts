import type { Difficulty } from '../../core/index';
import { $ } from '../dom';
import { closeModal, modal } from '../modal';
import type { ScreenContext } from '../screen-context';
export function settings(ctx: ScreenContext) {
  const wasPlaying = !ctx.online && ctx.battle.phase === 'playing' && ctx.mode === 'battle';
  if (wasPlaying) {
    ctx.battle.phase = 'paused';
    ctx.sound.stop();
  }
  modal(
    `<div class="modal-content"><span class="eyebrow">TÙY CHỈNH TRẢI NGHIỆM</span><h2>Thiết lập</h2><label class="setting-row"><span>Hiệu ứng âm thanh<small>Âm thanh chiến đấu và giao diện</small></span><input id="setting-sound" type="checkbox" ${ctx.sound.enabled ? 'checked' : ''}></label><label class="setting-row"><span>Đồ họa<small>Tiết kiệm giảm bóng đổ và độ phân giải</small></span><select id="setting-quality"><option value="high">Chất lượng cao</option><option value="low">Tiết kiệm</option></select></label><label class="setting-row"><span>Chiến thuật AI<small>Cùng mana và chỉ số; khác nhịp quyết định</small></span><select id="setting-difficulty" ${ctx.mode === 'battle' ? 'disabled' : ''}><option value="story">Khám phá</option><option value="normal">Tiêu chuẩn</option><option value="hard">Thử thách</option></select></label><div class="controls-help"><b>Điều khiển</b><p>1–${ctx.gameplay.deck.handSize}: thẻ đang cầm · W/E/R: triển khai theo đường<br>Q: cộng hưởng · Esc: hủy / tạm dừng · F3: debug<br>Điện thoại: kéo thẻ vào sân, hoặc chạm thẻ rồi chạm đường.</p></div><button class="primary full" id="settings-done">Lưu & tiếp tục</button></div>`,
  );
  $<HTMLSelectElement>('#setting-quality').value = ctx.world.quality;
  $<HTMLSelectElement>('#setting-difficulty').value = ctx.difficulty;
  $('#settings-done').onclick = () => {
    ctx.sound.enabled = $<HTMLInputElement>('#setting-sound').checked;
    ctx.world.setQuality($<HTMLSelectElement>('#setting-quality').value as 'high' | 'low');
    if (ctx.mode === 'lobby')
      ctx.difficulty = $<HTMLSelectElement>('#setting-difficulty').value as Difficulty;
    ctx.persist();
    closeModal();
    if (wasPlaying) {
      ctx.battle.phase = 'playing';
      ctx.accumulator = 0;
    }
  };
}
