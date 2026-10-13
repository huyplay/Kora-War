import { $, escapeHTML } from '../dom';
import { modal, closeModal } from '../modal';
import type { PvpSession } from '../../services/pvp-session';
import type { SpellId } from '../../data/spells';
export function pvpScreen(session: PvpSession, deck: string[], spells: SpellId[], onLeave: () => void) {
  const code = session.packet?.code;
  modal(
    `<div class="modal-content centered"><span class="eyebrow">ĐẤU ĐỐI KHÁNG · CHỈ SỐ CHUẨN HÓA</span><h2>PvP 1 đấu 1</h2>${code ? `<p>Mã phòng · gửi cho bạn chơi</p><strong class="room-code">${escapeHTML(code)}</strong><p id="pvp-status" role="status">Đang chờ đối thủ…</p><button class="secondary full" id="pvp-leave">Rời phòng</button>` : '<p>4 tướng + 2 phép · cùng chỉ số cấp 1</p><button class="primary full" id="pvp-create">Tạo phòng</button><label class="room-label">Mã phòng<input id="pvp-code" maxlength="12" autocomplete="off" placeholder="Mã từ bạn chơi" /></label><button class="secondary full" id="pvp-join">Vào phòng</button><p id="pvp-status" role="status"></p><button class="text-button" id="pvp-close">Quay lại</button>'}</div>`,
  );
  const run = async (fn: () => Promise<void>) => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.modal button'));
    buttons.forEach((b) => (b.disabled = true));
    try {
      await fn();
    } catch (e) {
      if ($('#pvp-status')) $('#pvp-status').textContent = e instanceof Error ? e.message : String(e);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  if (code)
    $('#pvp-leave').onclick = () =>
      void run(async () => {
        await session.leave();
        closeModal();
        onLeave();
      });
  else {
    $('#pvp-close').onclick = closeModal;
    $('#pvp-create').onclick = () =>
      void run(async () => {
        await session.open(deck, spells);
        if (session.packet?.waiting) pvpScreen(session, deck, spells, onLeave);
      });
    $('#pvp-join').onclick = () =>
      void run(async () => {
        const value = $<HTMLInputElement>('#pvp-code').value.trim().toUpperCase();
        if (!/^[A-F0-9]{12}$/.test(value)) throw new Error('Nhập mã phòng 12 ký tự.');
        await session.open(deck, spells, value);
        if (session.packet?.waiting) pvpScreen(session, deck, spells, onLeave);
      });
  }
}
