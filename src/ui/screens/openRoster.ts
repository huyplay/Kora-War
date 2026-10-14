import { ORIGINS, ROLES, traits } from '../../data/index';
import { cardDeckError } from '../../data/card-decks';
import { SPELLS, isSpell } from '../../data/spells';
import { $, escapeHTML } from '../dom';
import { icon } from '../icons';
import { closeModal, modal } from '../modal';
import { spellCard } from '../spell-card';
import type { ScreenContext } from '../screen-context';
export function openRoster(ctx: ScreenContext, focusId = ctx.cards[0]) {
  if (ctx.mode === 'battle') {
    ctx.toast('Bộ bài được khóa trong trận.');
    return;
  }
  let draft = ctx.cards.slice(),
    inspected = focusId;
  const tile = (id: string, i: number) =>
    isSpell(id) ? spellCard(id, i, true) : ctx.card(ctx.heroMap[id], i, true);
  const catalog = [...ctx.heroes.map((hero) => hero.id), ...Object.keys(SPELLS)];
  modal(
    `<div class="modal-top"><div><span class="eyebrow">BỘ BÀI ELYNDRA</span><h2>Xây bộ bài 14 thẻ</h2><p>Mỗi thẻ 1 bản · tay 6 thẻ · đổi tối đa 2 thẻ đầu trận</p></div><button class="icon-button" id="roster-close" aria-label="Đóng đội hình">${icon('close')}</button></div><div class="deck-builder"><div class="deck-builder-title"><strong id="draft-count"></strong><span id="draft-traits"></span></div><div id="deck-slots" class="deck-slots"></div><div class="collection-title"><strong>Bộ sưu tập</strong><span>10 tướng · 8 phép</span></div><div id="roster-grid" class="card-collection">${catalog.map(tile).join('')}</div><div id="hero-detail" class="deck-detail"></div><div class="roster-footer"><p id="deck-error" role="status"></p><button class="primary" id="save-deck">Lưu bộ bài</button></div></div>`,
    true,
  );
  const refresh = () => {
    $('#deck-slots').innerHTML = Array.from({ length: 14 }, (_, i) =>
      draft[i]
        ? `<div class="deck-slot">${tile(draft[i], i)}<button class="remove-card" data-remove="${draft[i]}" aria-label="Bỏ ${isSpell(draft[i]) ? SPELLS[draft[i] as keyof typeof SPELLS].name : ctx.heroMap[draft[i]].name} khỏi deck">×</button></div>`
        : `<div class="deck-slot empty-slot"><span>${i + 1}</span></div>`,
    ).join('');
    const heroes = draft.filter((id) => !isSpell(id)),
      active = Object.entries(traits(heroes))
        .filter(([, n]) => n >= 2)
        .map(([id]) => (({ ...ORIGINS, ...ROLES }) as Record<string, { name: string }>)[id].name);
    $('#draft-count').textContent =
      `${draft.length} / 14 THẺ · ${heroes.length} tướng · ${draft.length - heroes.length} phép`;
    $('#draft-traits').textContent = active.join(' · ');
    const error = cardDeckError(draft);
    $('#deck-error').textContent = error ?? 'Bộ bài sẵn sàng';
    $('#save-deck').toggleAttribute('disabled', !!error);
    const info = isSpell(inspected) ? SPELLS[inspected] : ctx.heroMap[inspected];
    $('#hero-detail').innerHTML =
      `<div><strong>${escapeHTML(info.name)}</strong><span>${info.cost} ◆ · ${escapeHTML(info.description)}</span></div><button id="toggle-hero" class="secondary">${draft.includes(inspected) ? '− Bỏ thẻ' : '+ Thêm thẻ'}</button>`;
    $('#toggle-hero').onclick = () => {
      if (draft.includes(inspected)) draft = draft.filter((id) => id !== inspected);
      else if (draft.length < 14) draft.push(inspected);
      else {
        ctx.toast('Deck đã đủ 14 thẻ. Bỏ một thẻ trước khi thêm.');
        return;
      }
      refresh();
    };
    document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach((button) => {
      button.classList.toggle('in-deck', draft.includes(button.dataset.hero!));
      button.setAttribute('aria-pressed', String(draft.includes(button.dataset.hero!)));
    });
    document.querySelectorAll<HTMLElement>('[data-remove]').forEach(
      (button) =>
        (button.onclick = () => {
          draft = draft.filter((id) => id !== button.dataset.remove);
          refresh();
        }),
    );
    document.querySelectorAll<HTMLElement>('#deck-slots .hero-card').forEach(
      (button) =>
        (button.onclick = () => {
          inspected = button.dataset.hero!;
          refresh();
        }),
    );
  };
  document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach(
    (button) =>
      (button.onclick = () => {
        inspected = button.dataset.hero!;
        refresh();
      }),
  );
  $('#save-deck').onclick = () => {
    if (cardDeckError(draft)) return;
    ctx.cards = draft.slice();
    ctx.deck = draft.filter((id) => !isSpell(id));
    ctx.spells = draft.filter(isSpell);
    ctx.persist();
    ctx.preview();
    ctx.renderDeck();
    closeModal();
    ctx.toast('Đã lưu bộ bài 14 thẻ.');
  };
  $('#roster-close').onclick = closeModal;
  refresh();
}
