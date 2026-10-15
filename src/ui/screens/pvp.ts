import { $, escapeHTML as esc } from '../dom';
import {
  competitionOf,
  type QueueMode,
  type CompetitionOverview,
  type Standing,
} from '../../data/competition';
import { gameSession } from '../../services/game-session';
import { api } from '../../services/api';
import { modal, closeModal, ownModal } from '../modal';
import { fitPages } from '../fit-pages';
import { icon } from '../icons';
import type { PvpSession } from '../../services/pvp-session';
import type { SpellId } from '../../data/spells';
import '../styles/competition.css';

const backButton = (id: string) =>
  `<button class="icon-button arena-back" id="${id}" aria-label="Về đấu trường">${icon('chevron')}</button>`;
function showProfile(root: HTMLElement, self: Standing) {
  root.innerHTML = `<strong>${self.rating}</strong><span>${esc(self.tier)}${self.rank ? ` · #${self.rank}` : ''}</span>`;
  root.setAttribute(
    'aria-label',
    `${self.name} · ${self.tier} · ${self.rating} Elo · ${self.games} trận hạng${self.rank ? ` · hạng ${self.rank}` : ''}`,
  );
}

export function pvpScreen(
  session: PvpSession,
  deck: string[],
  spells: SpellId[],
  onLeave: () => void,
  cards?: string[],
  view: 'modes' | 'friends' = 'modes',
) {
  const packet = session.packet,
    code = packet?.code;
  const config = competitionOf(packet?.content ?? gameSession.content);
  const mode = packet?.mode ?? 'friendly',
    queued = mode !== 'friendly';
  const symbols = { casual: '⚔', ranked: '♜', challenge: 'ϟ' };
  const back = () => pvpScreen(session, deck, spells, onLeave, cards);
  modal(`<div class="modal-content competition-screen arena-${code ? 'waiting' : view}">
    <header class="competition-heading">${!code && view === 'friends' ? backButton('friends-back') : ''}<h2>${code ? esc(config.modes[mode].name) : view === 'friends' ? esc(config.modes.friendly.name) : 'Đấu trường'}</h2>
    ${!code && view === 'modes' ? '<div class="competition-profile" id="competition-profile" aria-label="Đang tải hồ sơ">—</div>' : ''}
    ${code ? '' : `<button class="icon-button" id="pvp-close" aria-label="Đóng đấu trường">${icon('close')}</button>`}</header>
    ${
      code
        ? `<div class="queue-display"><div class="queue-emblem" aria-hidden="true">${queued ? symbols[mode] : '◈'}</div>
      <h3>${queued ? 'Đang tìm đối thủ' : 'Mã phòng'}</h3>
      ${queued ? `<div class="queue-clock"><strong id="pvp-queue-time" role="timer" aria-label="Thời gian tìm trận">${packet.queueSeconds ?? 0}s</strong><span>/ ${config.queue.timeoutSeconds}s</span></div>` : `<strong class="room-code" aria-label="Mã phòng ${esc(code)}">${esc(code)}</strong>`}
      <p id="pvp-status" role="status"></p><button class="secondary" id="pvp-leave">${queued ? 'Hủy tìm trận' : 'Rời phòng'}</button></div>`
        : view === 'friends'
          ? `<div class="friend-content"><div class="friend-create"><span aria-hidden="true">◈</span><button class="primary" id="pvp-create" ${config.modes.friendly.enabled ? '' : 'disabled'}>Tạo phòng</button></div>
      <form class="friend-join" id="pvp-join-form"><label for="pvp-code">Mã phòng</label><input id="pvp-code" aria-label="Mã phòng bạn bè" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" placeholder="12 ký tự" ${config.modes.friendly.enabled ? '' : 'disabled'}><button class="secondary" id="pvp-join" ${config.modes.friendly.enabled ? '' : 'disabled'}>Vào phòng</button></form></div><p id="pvp-status" role="status">${config.modes.friendly.enabled ? '' : 'Chế độ đang tạm đóng.'}</p>`
          : `<div class="mode-grid">${(['ranked', 'casual', 'challenge'] as const).map((m) => `<button class="mode-card mode-${m}" data-queue="${m}" aria-label="${esc(config.modes[m].name)}. ${esc(config.modes[m].description)}" ${config.modes[m].enabled ? '' : 'disabled'}><span class="mode-symbol" aria-hidden="true">${symbols[m]}</span><strong>${esc(config.modes[m].name)}</strong><small>${esc(config.modes[m].description)}</small>${m === 'challenge' ? `<em>${config.challenge.manaPerSecond} mana/s · ${config.challenge.overtimeAt}s</em>` : ''}<span class="mode-enter" aria-hidden="true">${config.modes[m].enabled ? '→' : '×'}</span></button>`).join('')}</div>
      <nav class="competition-bottom" aria-label="Bạn bè và thành tích"><button class="secondary" id="friends-open">${esc(config.modes.friendly.name)}</button><button class="secondary" id="leaderboard-open">Xếp hạng</button></nav><p id="pvp-status" role="status"></p>`
    }</div>`);
  const root = document.querySelector<HTMLElement>('.competition-screen')!;
  const lifetime = new AbortController();
  ownModal(() => lifetime.abort());
  let busy = false;
  const run = async (fn: () => Promise<void>) => {
    if (busy || !root.isConnected) return;
    busy = true;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter((b) => !b.disabled);
    buttons.forEach((b) => (b.disabled = true));
    root.setAttribute('aria-busy', 'true');
    try {
      await fn();
    } catch (error) {
      if (root.isConnected)
        root.querySelector('#pvp-status')!.textContent =
          error instanceof Error ? error.message : String(error);
    } finally {
      busy = false;
      if (root.isConnected) {
        buttons.forEach((b) => (b.disabled = false));
        root.removeAttribute('aria-busy');
      }
    }
  };
  if (code) {
    $('#pvp-leave').onclick = () =>
      void run(async () => {
        await session.leave();
        if (root.isConnected) {
          closeModal();
          onLeave();
        }
      });
    return;
  }
  $('#pvp-close').onclick = closeModal;
  if (view === 'friends') {
    $('#friends-back').onclick = back;
    $('#pvp-create').onclick = () =>
      void run(async () => {
        await session.open(deck, spells, undefined, cards);
        if (root.isConnected && session.packet?.waiting) back();
      });
    $('#pvp-join-form').onsubmit = (e) => {
      e.preventDefault();
      if (!config.modes.friendly.enabled) return;
      void run(async () => {
        const value = $<HTMLInputElement>('#pvp-code').value.trim().toUpperCase();
        if (!/^[A-F0-9]{12}$/.test(value)) {
          $('#pvp-code').setAttribute('aria-invalid', 'true');
          $('#pvp-code').setAttribute('aria-describedby', 'pvp-status');
          $('#pvp-code').focus({ preventScroll: true });
          throw new Error('Nhập mã phòng 12 ký tự.');
        }
        await session.open(deck, spells, value, cards);
        if (root.isConnected && session.packet?.waiting) back();
      });
    };
    $('#pvp-code').oninput = () => {
      $('#pvp-code').removeAttribute('aria-invalid');
      $('#pvp-status').textContent = '';
    };
    return;
  }
  const badge = $('#competition-profile');
  void api<CompetitionOverview>('/api/pvp/overview', 'GET', undefined, lifetime.signal)
    .then((data) => {
      if (root.isConnected) showProfile(badge, data.self);
    })
    .catch(() => {
      if (root.isConnected) badge.setAttribute('aria-label', 'Hồ sơ chưa tải. Mở xếp hạng để thử lại.');
    });
  root.querySelectorAll<HTMLButtonElement>('[data-queue]').forEach(
    (button) =>
      (button.onclick = () =>
        void run(async () => {
          if (!cards) throw new Error('Cần bộ bài cycle-v1 để ghép trận.');
          await session.queue(button.dataset.queue as QueueMode, cards, gameSession.revision);
          if (root.isConnected && session.packet?.waiting) back();
        })),
  );
  $('#friends-open').onclick = () => pvpScreen(session, deck, spells, onLeave, cards, 'friends');
  $('#leaderboard-open').onclick = () => leaderboard(back);
}

function leaderboard(back: () => void) {
  const labels = { win: 'Thắng', loss: 'Thua', draw: 'Hòa', void: 'Hủy' };
  modal(`<div class="modal-content competition-screen arena-ranking"><header class="competition-heading">${backButton('ranking-back')}<h2>Thành tích</h2><div class="competition-profile" id="ranking-profile" aria-label="Đang tải hồ sơ">—</div></header>
    <nav class="screen-tabs" aria-label="Bảng hạng và lịch sử"><button data-ranking-tab="rank" aria-pressed="true" class="active" disabled>Xếp hạng</button><button data-ranking-tab="history" aria-pressed="false" disabled>Lịch sử</button></nav>
    <div class="ranking-loading" role="status">Đang tải…</div><section class="ranking-page" data-ranking-page="rank" hidden><div class="ranking-list" id="ranking-list" aria-label="Xếp hạng"></div></section><section class="ranking-page" data-ranking-page="history" hidden><div class="ranking-list" id="history-list" aria-label="Lịch sử trận"></div></section></div>`);
  const root = document.querySelector<HTMLElement>('.arena-ranking')!;
  const lifetime = new AbortController();
  ownModal(() => lifetime.abort());
  $('#ranking-back').onclick = back;
  const load = async () => {
    const loading = root.querySelector<HTMLElement>('.ranking-loading')!;
    loading.textContent = 'Đang tải…';
    try {
      const data = await api<CompetitionOverview>('/api/pvp/overview', 'GET', undefined, lifetime.signal);
      if (!root.isConnected) return;
      showProfile($('#ranking-profile'), data.self);
      $('#ranking-list').innerHTML = data.leaderboard.length
        ? data.leaderboard
            .map(
              (r) =>
                `<div class="ranking-row ${r.self ? 'is-self' : ''}"><b>#${r.rank}</b><span>${esc(r.name)}<small>${esc(r.tier)} · ${r.wins}/${r.games} thắng</small></span><strong aria-label="${r.rating} Elo">${r.rating}</strong></div>`,
            )
            .join('')
        : '<p class="ranking-empty">Chưa có trận hạng.</p>';
      $('#history-list').innerHTML = data.history.length
        ? data.history
            .map(
              (h) =>
                `<div class="history-row"><b class="history-${h.corrected ? 'void' : h.result}">${h.corrected ? 'Đã hủy' : labels[h.result]}</b><span>${esc(h.map)}<small>${h.mode === 'ranked' ? 'Đấu hạng' : h.mode === 'challenge' ? 'Thử thách' : h.mode === 'casual' ? 'Đấu thường' : 'Bạn bè'} · ${esc(new Date(h.ended).toLocaleString('vi-VN'))}${h.reason === 'server-restart' ? ' · gián đoạn máy chủ' : ''}</small></span><strong aria-label="${h.corrected ? 'Kết quả đã hủy, Elo được hoàn tác' : h.mode === 'ranked' ? `Thay đổi ${h.delta} Elo` : 'Không tính hạng'}">${h.corrected ? '↶' : h.mode === 'ranked' ? `${h.delta >= 0 ? '+' : ''}${h.delta}` : '—'}</strong></div>`,
            )
            .join('')
        : '<p class="ranking-empty">Chưa có trận đấu.</p>';
      loading.hidden = true;
      root.querySelector<HTMLElement>('[data-ranking-page="rank"]')!.hidden = false;
      for (const [id, label] of [
        ['ranking-list', 'Xếp hạng'],
        ['history-list', 'Lịch sử trận'],
      ])
        ownModal(fitPages($(`#${id}`), label).dispose);
      root.querySelectorAll<HTMLButtonElement>('[data-ranking-tab]').forEach((button) => {
        button.disabled = false;
        button.onclick = () => {
          root
            .querySelectorAll<HTMLElement>('[data-ranking-page]')
            .forEach((page) => (page.hidden = page.dataset.rankingPage !== button.dataset.rankingTab));
          root.querySelectorAll<HTMLElement>('[data-ranking-tab]').forEach((tab) => {
            tab.classList.toggle('active', tab === button);
            tab.setAttribute('aria-pressed', String(tab === button));
          });
        };
      });
    } catch {
      if (!root.isConnected) return;
      loading.innerHTML =
        '<p>Chưa tải được thành tích.</p><button class="secondary" id="ranking-retry">Thử lại</button>';
      $('#ranking-retry').onclick = () => void load();
    }
  };
  void load();
}
