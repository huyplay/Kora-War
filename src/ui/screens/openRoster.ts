import { ORIGINS, ROLES, traits } from '../../data/index';
import { $, escapeHTML } from '../dom';
import { icon } from '../icons';
import { closeModal, modal } from '../modal';
import type { ScreenContext } from '../screen-context';
import { SPELLS, type SpellId } from '../../data/spells';
export function openRoster(ctx: ScreenContext, focusId = ctx.deck[0]) {
  const HEROES = ctx.heroes,
    HERO_MAP = ctx.heroMap;
  if (ctx.mode === 'battle') {
    ctx.toast('Đội hình được khóa trong trận. Bạn có thể đổi ở sảnh.');
    return;
  }
  let draft = ctx.deck.slice();
  let spells = ctx.spells.slice();
  let inspected = HERO_MAP[focusId] ? focusId : ctx.deck[0];
  modal(
    `<div class="modal-top"><div><span class="eyebrow">NHỮNG NGƯỜI BẢO HỘ ELYNDRA</span><h2>Chọn người đồng hành.</h2><p>Ghép 2 tướng cùng tộc hoặc hệ để kích hoạt synergy.</p></div><button class="icon-button" id="roster-close" aria-label="Đóng đội hình">${icon('close')}</button></div><div class="roster-layout"><div id="roster-grid">${HEROES.map((h, i) => ctx.card(h, i, true)).join('')}</div><aside id="hero-detail"></aside></div><div class="roster-footer"><div><strong id="draft-count"></strong><span id="draft-traits"></span></div><button class="primary" id="save-deck">Lưu đội hình ${icon('chevron')}</button></div>`,
    true,
  );
  $('.roster-footer').insertAdjacentHTML(
    'beforebegin',
    `<div class="spell-roster" aria-label="Chọn hai phép">${Object.values(SPELLS)
      .map(
        (s) =>
          `<button class="spell-choice" data-spell="${s.id}" title="${s.description}"><b>${s.icon} ${s.name}</b><small>${s.cost} ◆ · ${s.cooldown}s</small><span>${s.description}</span></button>`,
      )
      .join('')}</div>`,
  );
  const refresh = () => {
    document.querySelectorAll<HTMLElement>('[data-spell]').forEach((b) => {
      b.classList.toggle('selected', spells.includes(b.dataset.spell as SpellId));
      b.setAttribute('aria-pressed', String(spells.includes(b.dataset.spell as SpellId)));
    });
    const h = HERO_MAP[inspected];
    document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach((b) => {
      b.classList.toggle('in-deck', draft.includes(b.dataset.hero!));
      b.classList.toggle('inspected', b.dataset.hero === inspected);
    });
    $('#draft-count').textContent = `${draft.length}/4 TƯỚNG · ${spells.length}/2 PHÉP`;
    const active = Object.entries(traits(draft))
      .filter(([, n]) => n >= 2)
      .map(
        ([id]) =>
          (
            ORIGINS as Record<
              string,
              {
                name: string;
              }
            >
          )[id]?.name ||
          (
            ROLES as Record<
              string,
              {
                name: string;
              }
            >
          )[id]?.name,
      );
    $('#draft-traits').textContent = active.length ? active.join(' + ') : 'Chưa có liên kết kích hoạt';
    $('#save-deck').toggleAttribute('disabled', draft.length !== 4 || spells.length !== 2);
    $('#hero-detail').innerHTML =
      `<span class="eyebrow" style="color:${ORIGINS[h.origin].color}">${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].name} · ${ROLES[h.role].name}</span><h3>${h.name}</h3><p class="hero-title">${escapeHTML(h.title)}</p><div class="stat-grid"><span><b>${h.hp}</b>Máu</span><span><b>${h.attack}</b>Sát thương</span><span><b>${h.range}m</b>Tầm đánh</span><span><b>${h.cost}</b>Mana</span></div><h4>✦ ${escapeHTML(h.ability)}</h4><p>${escapeHTML(h.description)}</p><small>Tự dùng khi có mục tiêu phù hợp. Hồi ${h.skillCooldown} giây.</small><div class="detail-traits"><p>${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].effect}</p><p>${ROLES[h.role].icon} ${ROLES[h.role].effect}</p></div><button class="secondary" id="toggle-hero">${draft.includes(h.id) ? '− Bỏ khỏi đội hình' : '+ Thêm vào đội hình'}</button>`;
    $('#toggle-hero').onclick = () => {
      if (draft.includes(h.id)) draft = draft.filter((id) => id !== h.id);
      else if (draft.length < 4) draft.push(h.id);
      else {
        ctx.toast('Đội hình đã đủ 4 tướng. Bỏ một tướng trước khi thêm.');
        return;
      }
      refresh();
    };
  };
  document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach(
    (b) =>
      (b.onclick = () => {
        inspected = b.dataset.hero!;
        refresh();
      }),
  );
  document.querySelectorAll<HTMLElement>('[data-spell]').forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.spell as SpellId;
        if (spells.includes(id)) spells = spells.filter((s) => s !== id);
        else if (spells.length < 2) spells.push(id);
        else ctx.toast('Bỏ một phép trước khi chọn phép khác.');
        refresh();
      }),
  );
  $('#save-deck').onclick = () => {
    if (draft.length !== 4 || spells.length !== 2) return;
    ctx.deck = draft;
    ctx.spells = spells;
    ctx.persist();
    ctx.renderDeck();
    ctx.preview();
    closeModal();
    ctx.toast('Đội hình đã sẵn sàng.');
  };
  $('#roster-close').onclick = closeModal;
  refresh();
}
