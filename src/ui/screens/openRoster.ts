import { ORIGINS, ROLES, traits } from '../../data/index';
import { cardDeckError } from '../../data/card-decks';
import { isSpell, type SpellId } from '../../data/spells';
import { $, escapeHTML } from '../dom';
import { icon } from '../icons';
import { closeModal, modal, ownModal } from '../modal';
import { pageDeck } from '../page-deck';
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
    `<div class="modal-top"><h2>Bộ bài</h2><button class="icon-button" id="roster-close" aria-label="Đóng đội hình">${icon('close')}</button></div><div class="deck-builder"><nav class="screen-tabs" aria-label="Bộ bài và bộ sưu tập"><button data-roster-tab="deck" class="active" aria-pressed="true">Bộ bài</button><button data-roster-tab="collection" aria-pressed="false">Bộ sưu tập</button></nav><section id="roster-equipped"><div class="deck-builder-title"><strong id="draft-count"></strong><span id="draft-traits"></span></div><div id="deck-slots" class="deck-slots" style="--deck-columns:${Math.min(7, Math.ceil(rules.size / 2))}"></div></section><section id="roster-collection" hidden><div class="collection-title"><strong>${catalog.length} thẻ</strong><span>${ctx.heroes.length} tướng · ${catalog.length - ctx.heroes.length} phép</span></div><div id="roster-grid" class="card-collection">${catalog.map(tile).join('')}</div></section><div class="roster-footer"><div id="hero-detail" class="deck-detail"></div><button class="primary" id="save-deck">Lưu</button></div><p id="deck-error" role="status" hidden></p></div>`,
    true,
  );
  let deckPager: ReturnType<typeof pageDeck> | undefined;
  const catalogPager = pageDeck($('#roster-grid'), 6, 'Bộ sưu tập');
  ownModal(() => {
    catalogPager.dispose();
    deckPager?.dispose();
  });
  document.querySelectorAll<HTMLElement>('[data-roster-tab]').forEach(
    (button) =>
      (button.onclick = () => {
        const collection = button.dataset.rosterTab === 'collection';
        $('#roster-equipped').hidden = collection;
        $('#roster-collection').hidden = !collection;
        document.querySelectorAll<HTMLElement>('[data-roster-tab]').forEach((b) => {
          b.classList.toggle('active', b === button);
          b.setAttribute('aria-pressed', String(b === button));
        });
      }),
  );
  const inspect = () => {
    const info = isSpell(inspected) ? SPELLS[inspected] : ctx.heroMap[inspected];
    const remove = draft.filter((id) => id === inspected).length >= rules.maxCopies;
    $('#hero-detail').innerHTML =
      `<div><strong>${escapeHTML(info.name)}</strong><span>${info.cost} ◆ · ${escapeHTML(info.description)}</span></div><button id="toggle-hero" class="secondary" aria-label="${remove ? 'Bỏ' : 'Thêm'} ${escapeHTML(info.name)} ${remove ? 'khỏi' : 'vào'} bộ bài">${remove ? '− Bỏ' : '+ Thêm'}</button>`;
    $('#toggle-hero').onclick = () => {
      if (remove) draft.splice(draft.indexOf(inspected), 1);
      else if (draft.length < rules.size) draft.push(inspected);
      else {
        ctx.toast(`Bỏ một thẻ để thêm ${info.name}.`);
        return;
      }
      refresh();
      $('#toggle-hero').focus({ preventScroll: true });
    };
    document.querySelectorAll<HTMLElement>('.deck-builder .hero-card').forEach((button) => {
      const selected = button.dataset.hero === inspected;
      button.classList.toggle('is-inspected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-describedby', 'hero-detail');
    });
  };
  const refresh = () => {
    const page = deckPager?.page ?? 0;
    deckPager?.dispose();
    $('#deck-slots').innerHTML = Array.from({ length: rules.size }, (_, i) =>
      draft[i]
        ? `<div class="deck-slot">${tile(draft[i], i)}</div>`
        : `<div class="deck-slot empty-slot"><span>${i + 1}</span></div>`,
    ).join('');
    deckPager = pageDeck($('#deck-slots'), 14, 'Bộ bài');
    deckPager.show(page);
    const heroes = [...new Set(draft.filter((id) => !isSpell(id)))],
      active = Object.entries(traits(heroes))
        .filter(([id, n]) => n >= config.synergies[id as keyof typeof config.synergies].required)
        .map(([id]) => (({ ...ORIGINS, ...ROLES }) as Record<string, { name: string }>)[id].name);
    $('#draft-count').textContent =
      `${draft.length} / ${rules.size} THẺ · ${heroes.length} tướng · ${draft.filter(isSpell).length} phép`;
    $('#draft-traits').textContent = active.join(' · ');
    const error = cardDeckError(draft, config);
    $('#deck-error').textContent = error ?? '';
    $('#deck-error').hidden = !error;
    $('#save-deck').toggleAttribute('disabled', !!error);
    $('#save-deck').setAttribute('aria-label', `Lưu bộ bài ${draft.length}/${rules.size} thẻ`);
    document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach((button) => {
      button.classList.toggle('in-deck', draft.includes(button.dataset.hero!));
    });
    document.querySelectorAll<HTMLElement>('#deck-slots .hero-card').forEach(
      (button) =>
        (button.onclick = () => {
          inspected = button.dataset.hero!;
          inspect();
        }),
    );
    inspect();
  };
  document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach(
    (button) =>
      (button.onclick = () => {
        inspected = button.dataset.hero!;
        inspect();
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
