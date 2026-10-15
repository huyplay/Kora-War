import { $ } from '../dom';
import { icon } from '../icons';
import { closeModal, modal } from '../modal';
import type { ScreenContext } from '../screen-context';
export function pause(ctx: ScreenContext) {
  if (ctx.mode !== 'battle' || ctx.battle.phase !== 'playing') return;
  if (ctx.online) {
    ctx.clearSelection();
    modal(
      '<div class="modal-content centered"><h2>Trận PvP đang tiếp tục</h2><p>Trận trực tuyến không tạm dừng. Rời trận tính là đầu hàng.</p><button class="primary full" id="resume">Tiếp tục</button><button class="secondary full" id="leave">Đầu hàng & về sảnh</button></div>',
    );
    $('#resume').onclick = closeModal;
    $('#leave').onclick = ctx.lobby;
    return;
  }
  ctx.battle.phase = 'paused';
  ctx.sound.stop();
  ctx.clearSelection();
  modal(
    `<div class="modal-content centered"><h2>Tạm dừng</h2><button class="primary full" id="resume">${icon('play')} Tiếp tục</button><button class="secondary full" id="restart">${icon('retry')} Chơi lại</button><button class="text-button" id="leave">Về sảnh</button></div>`,
  );
  $('#resume').onclick = () => {
    closeModal();
    ctx.battle.phase = 'playing';
    ctx.accumulator = 0;
  };
  $('#restart').onclick = () => ctx.startBattle();
  $('#leave').onclick = ctx.lobby;
}
