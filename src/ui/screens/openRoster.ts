import { ORIGINS, ROLES, traits } from '../../data/index';
import { cardDeckError } from '../../data/card-decks';
import { isSpell, type SpellId } from '../../data/spells';
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
  const config = ctx.gameplay,
    rules = config.deck,
    SPELLS = config.spells;
  let draft = ctx.cards.slice(),
    inspected = focusId;
  const tile = (id: string, i: number) =>
    isSpell(id) ? spellCard(id, i, true, SPELLS) : ctx.card(ctx.heroMap[id], i, true);
  const catalog = [
    ...ctx.heroes.map((hero) => hero.id),
    ...Object.keys(SPELLS).filter((id) => SPELLS[id as SpellId].enabled),
  ];
  modal(
    `<div class="modal-top"><div><span class="eyebrow">BỘ BÀI ELYNDRA</span><h2>Xây bộ bài ${rules.size} thẻ</h2><p>Tối đa ${rules.maxCopies} bản/thẻ · tay ${rules.handSize} · đổi ${rules.mulligan} thẻ đầu trận</p></div><button class="icon-button" id="roster-close" aria-label="Đóng đội hình">${icon('close')}</button></div><div class="deck-builder"><div class="deck-builder-title"><strong id="draft-count"></strong><span id="draft-traits"></span></div><div id="deck-slots" class="deck-slots" style="--deck-columns:${Math.min(7, Math.ceil(rules.size / 2))}"></div><div class="collection-title"><strong>Bộ sưu tập</strong><span>${ctx.heroes.length} tướng · ${catalog.length - ctx.heroes.length} phép</span></div><div id="roster-grid" class="card-collection">${catalog.map(tile).join('')}</div><div id="hero-detail" class="deck-detail"></div><div class="roster-footer"><p id="deck-error" role="status"></p><button class="primary" id="save-deck">Lưu bộ bài</button></div></div>`,
    true,
  );
  const refresh = () => {
    $('#deck-slots').innerHTML = Array.from({ length: rules.size }, (_, i) =>
      draft[i]
        ? `<div class="deck-slot">${tile(draft[i], i)}<button class="remove-card" data-remove="${i}" aria-label="Bỏ ${escapeHTML(isSpell(draft[i]) ? SPELLS[draft[i] as keyof typeof SPELLS].name : ctx.heroMap[draft[i]].name)} khỏi deck">×</button></div>`
        : `<div class="deck-slot empty-slot"><span>${i + 1}</span></div>`,
    ).join('');
    const heroes = [...new Set(draft.filter((id) => !isSpell(id)))],
      active = Object.entries(traits(heroes))
        .filter(([id, n]) => n >= config.synergies[id as keyof typeof config.synergies].required)
        .map(([id]) => (({ ...ORIGINS, ...ROLES }) as Record<string, { name: string }>)[id].name);
    $('#draft-count').textContent =
      `${draft.length} / ${rules.size} THẺ · ${heroes.length} tướng · ${draft.filter(isSpell).length} phép`;
    $('#draft-traits').textContent = active.join(' · ');
    const error = cardDeckError(draft, config);
    $('#deck-error').textContent = error ?? 'Bộ bài sẵn sàng';
    $('#save-deck').toggleAttribute('disabled', !!error);
    const info = isSpell(inspected) ? SPELLS[inspected] : ctx.heroMap[inspected];
    $('#hero-detail').innerHTML =
      `<div><strong>${escapeHTML(info.name)}</strong><span>${info.cost} ◆ · ${escapeHTML(info.description)}</span></div><button id="toggle-hero" class="secondary">${draft.filter((id) => id === inspected).length >= rules.maxCopies ? '− Bỏ thẻ' : '+ Thêm thẻ'}</button>`;
    $('#toggle-hero').onclick = () => {
      if (draft.filter((id) => id === inspected).length >= rules.maxCopies)
        draft.splice(draft.indexOf(inspected), 1);
      else if (draft.length < rules.size) draft.push(inspected);
      else {
        ctx.toast(`Deck đã đủ ${rules.size} thẻ. Bỏ một thẻ trước khi thêm.`);
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
          draft.splice(Number(button.dataset.remove), 1);
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
    if (cardDeckError(draft, config)) return;
    ctx.cards = draft.slice();
    ctx.deck = [...new Set(draft.filter((id) => !isSpell(id)))];
    ctx.spells = [...new Set(draft.filter(isSpell))];
    ctx.persist();
    ctx.preview();
    ctx.renderDeck();
    closeModal();
    ctx.toast(`Đã lưu bộ bài ${rules.size} thẻ.`);
  };
  $('#roster-close').onclick = closeModal;
  refresh();
}
