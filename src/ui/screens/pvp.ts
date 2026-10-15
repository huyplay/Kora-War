import { $, escapeHTML } from '../dom';
import { competitionOf, type QueueMode, type CompetitionOverview } from '../../data/competition';
import { gameSession } from '../../services/game-session';
import { api } from '../../services/api';
import { modal, closeModal } from '../modal';
import type { PvpSession } from '../../services/pvp-session';
import type { SpellId } from '../../data/spells';
import '../styles/competition.css';

export function pvpScreen(
  session: PvpSession,
  deck: string[],
  spells: SpellId[],
  onLeave: () => void,
  cards?: string[],
) {
  const packet = session.packet,
    code = packet?.code;
  const config = competitionOf(packet?.content ?? gameSession.content);
  const mode = packet?.mode ?? 'friendly';
  const queued = mode !== 'friendly';
  const symbols = { casual: '⚔', ranked: '♜', challenge: 'ϟ' };
  modal(`<div class="modal-content competition-screen">
    <div class="competition-heading"><div><span class="eyebrow">ELYNDRA · CHỈ SỐ CHUẨN HÓA</span><h2>${code ? escapeHTML(config.modes[mode].name) : 'Đấu trường'}</h2></div>
    ${code ? '' : '<button class="text-button" id="pvp-close" aria-label="Đóng đấu trường">✕</button>'}</div>
    ${
      code
        ? `<div class="queue-display"><div class="queue-emblem" aria-hidden="true">${queued ? symbols[mode] : '◈'}</div><h3>${queued ? 'Đang tìm đối thủ' : 'Mời bạn cùng đấu'}</h3>
      ${queued ? `<p>${escapeHTML(config.modes[mode].description)}</p><small>Tối đa ${config.queue.timeoutSeconds}s · chỉ ghép người chơi thật</small>` : `<p>Mã phòng · gửi cho bạn chơi</p><strong class="room-code">${escapeHTML(code)}</strong>`}
      <p id="pvp-status" role="status">Đang chờ đối thủ…</p><button class="secondary full" id="pvp-leave">${queued ? 'Hủy tìm trận' : 'Rời phòng'}</button></div>`
        : `
      <div class="competition-profile" id="competition-profile" role="status">Đang tải hồ sơ…</div>
      <div class="mode-grid">${(['ranked', 'casual', 'challenge'] as const).map((m) => `<button class="mode-card mode-${m}" data-queue="${m}" ${!config.modes[m].enabled ? 'disabled' : ''}><span class="mode-symbol" aria-hidden="true">${symbols[m]}</span><strong>${escapeHTML(config.modes[m].name)}</strong><small>${escapeHTML(config.modes[m].description)}</small>${m === 'challenge' ? `<em>${config.challenge.manaPerSecond} mana/s · quá tải ${config.challenge.overtimeAt}s</em>` : '<em>Map chuẩn · 3 chiến tuyến</em>'}<span class="mode-enter">${config.modes[m].enabled ? 'Tìm trận →' : 'Tạm đóng'}</span></button>`).join('')}</div>
      <div class="competition-bottom"><button class="secondary" id="leaderboard-open">♜ Xếp hạng & lịch sử</button><details class="friend-room"><summary>${escapeHTML(config.modes.friendly.name)}</summary><div class="friend-actions"><button class="secondary" id="pvp-create" ${config.modes.friendly.enabled ? '' : 'disabled'}>Tạo phòng</button><input id="pvp-code" aria-label="Mã phòng bạn bè" maxlength="12" autocomplete="off" placeholder="Mã phòng 12 ký tự" /><button class="secondary" id="pvp-join">Vào phòng</button></div></details></div><p id="pvp-status" role="status"></p>`
    }
    </div>`);
  const run = async (fn: () => Promise<void>) => {
    const root = document.querySelector('.competition-screen')!;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter((b) => !b.disabled);
    buttons.forEach((b) => (b.disabled = true));
    try {
      await fn();
    } catch (error) {
      const status = root.querySelector('#pvp-status');
      if (status) status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  };
  if (code) {
    $('#pvp-leave').onclick = () =>
      void run(async () => {
        await session.leave();
        closeModal();
        onLeave();
      });
    return;
  }
  const profile = $('#competition-profile');
  void api<CompetitionOverview>('/api/pvp/overview')
    .then((data) => {
      if (profile.isConnected)
        profile.textContent = `${data.self.name} · ${data.self.tier} · ${data.self.rating} Elo · ${data.self.games} trận hạng`;
    })
    .catch(() => {
      if (profile.isConnected) profile.textContent = 'Chưa tải được hồ sơ · kiểm tra kết nối';
    });
  $('#pvp-close').onclick = closeModal;
  document.querySelectorAll<HTMLButtonElement>('[data-queue]').forEach(
    (button) =>
      (button.onclick = () =>
        void run(async () => {
          if (!cards) throw new Error('Cần bộ bài cycle-v1 để ghép trận.');
          await session.queue(button.dataset.queue as QueueMode, cards, gameSession.revision);
          if (session.packet?.waiting) pvpScreen(session, deck, spells, onLeave, cards);
        })),
  );
  $('#pvp-create').onclick = () =>
    void run(async () => {
      await session.open(deck, spells, undefined, cards);
      if (session.packet?.waiting) pvpScreen(session, deck, spells, onLeave, cards);
    });
  $('#pvp-join').onclick = () =>
    void run(async () => {
      const value = $<HTMLInputElement>('#pvp-code').value.trim().toUpperCase();
      if (!/^[A-F0-9]{12}$/.test(value)) throw new Error('Nhập mã phòng 12 ký tự.');
      await session.open(deck, spells, value, cards);
      if (session.packet?.waiting) pvpScreen(session, deck, spells, onLeave, cards);
    });
  $('#leaderboard-open').onclick = () =>
    void run(async () => {
      const root = document.querySelector('.competition-screen');
      const data = await api<CompetitionOverview>('/api/pvp/overview');
      if (!root?.isConnected) return;
      leaderboard(data, () => pvpScreen(session, deck, spells, onLeave, cards));
    });
}

function leaderboard(data: CompetitionOverview, back: () => void) {
  const esc = escapeHTML;
  const resultLabels = { win: 'Thắng', loss: 'Thua', draw: 'Hòa', void: 'Hủy' };
  modal(`<div class="modal-content competition-screen"><div class="competition-heading"><div><span class="eyebrow">ĐẤU HẠNG · TOP 100</span><h2>Bảng xếp hạng</h2></div><button class="secondary" id="ranking-back">← Đấu trường</button></div>
    <p class="competition-profile">${esc(data.self.name)} · ${esc(data.self.tier)} · ${data.self.rating} Elo · ${data.self.rank ? `Hạng #${data.self.rank}` : 'Chưa có trận hạng'}</p>
    <div class="ranking-columns"><section><h3>Người Kết Nối</h3><div class="ranking-list">${data.leaderboard.length ? data.leaderboard.map((r) => `<div class="ranking-row ${r.self ? 'is-self' : ''}"><b>#${r.rank}</b><span>${esc(r.name)}<small>${esc(r.tier)} · ${r.wins}/${r.games} thắng</small></span><strong>${r.rating}</strong></div>`).join('') : '<p class="ranking-empty">Chưa có kết quả đấu hạng.<br>Hoàn thành trận đầu để xuất hiện tại đây.</p>'}</div></section>
    <section><h3>20 trận gần nhất</h3><div class="ranking-list">${data.history.length ? data.history.map((h) => `<div class="history-row"><b class="history-${h.result}">${h.corrected ? 'Đã hủy' : resultLabels[h.result]}</b><span>${esc(h.map)}<small>${h.mode === 'ranked' ? 'Đấu hạng' : h.mode === 'challenge' ? 'Thử thách' : h.mode === 'casual' ? 'Đấu thường' : 'Bạn bè'} · ${esc(new Date(h.ended).toLocaleString('vi-VN'))}${h.reason === 'server-restart' ? ' · server khởi động lại' : ''}</small></span><strong>${h.corrected ? 'Hoàn tác' : h.mode === 'ranked' ? `${h.delta >= 0 ? '+' : ''}${h.delta}` : '—'}</strong></div>`).join('') : '<p class="ranking-empty">Kết quả trận sẽ được lưu tại đây.</p>'}</div></section></div></div>`);
  $('#ranking-back').onclick = back;
}
