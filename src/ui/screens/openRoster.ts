import { ORIGINS, ROLES } from '../../data/index';
import { cardDeckError } from '../../data/card-decks';
import { isSpell, type SpellId } from '../../data/spells';
import { gameSession } from '../../services/game-session';
import { $, escapeHTML } from '../dom';
import { icon } from '../icons';
import { closeModal, modal, ownModal } from '../modal';
import { spellCard } from '../spell-card';
import { swipeRibbon } from '../swipe-ribbon';
import { collectionState } from '../collection-state';
import type { ScreenContext } from '../screen-context';
import type { ShowcaseAction } from '../../rendering/hero-showcase';

export function openRoster(ctx: ScreenContext, focusId = ctx.cards[0], forge = false) {
  if (ctx.mode === 'battle') {
    ctx.toast('Bộ bài được khóa trong trận.');
    return;
  }
  const config = ctx.gameplay,
    rules = config.deck,
    spells = config.spells;
  const catalog = [
    ...ctx.heroes.map((h) => h.id),
    ...Object.keys(spells).filter((id) => spells[id as SpellId].enabled),
  ];
  let draft = ctx.cards.slice(),
    inspected = catalog.includes(focusId) ? focusId : catalog[0];
  let replacing: string | undefined,
    disposed = false,
    busy = false;
  let returnFocus: HTMLElement | null = null;
  const info = (id: string) => (isSpell(id) ? spells[id] : ctx.heroMap[id]);
  const progress = (id: string) =>
    collectionState(id, gameSession.wallet, config.collection, gameSession.content.economy.upgradeBase);
  const art = (id: string) =>
    isSpell(id) ? spellCard(id, 0, true, spells) : ctx.card(ctx.heroMap[id], 0, true);
  const number = (n: number) => n.toLocaleString('vi-VN');
  const meter = (id: string) => {
    const p = progress(id);
    return isSpell(id)
      ? '<span class="figure-progress spell-progress">Phép</span>'
      : `<span class="figure-progress ${p.canUpgrade ? 'upgrade-ready' : ''}" style="--progress:${p.progress * 100}%"><i></i><b>${p.max ? 'MAX' : `${p.copies}/${p.need}`}</b>${p.canUpgrade ? '<em>↑</em>' : ''}</span>`;
  };
  modal(
    `<div class="roster-screen">
    <header class="roster-header"><button id="roster-close" class="roster-icon back-icon" aria-label="Đóng đội hình">${icon('chevron')}</button><div class="roster-heading"><h2>Bộ bài</h2><span id="draft-count"></span></div><span class="roster-gold" aria-label="Vàng"><i aria-hidden="true">●</i><b id="roster-gold"></b></span><button id="save-deck" class="roster-save">${icon('shield')}<span>Lưu</span></button></header>
    <div id="roster-canvas" class="roster-canvas"></div>
    <section class="roster-stage" aria-label="Đội hình đang chọn"><div id="deck-slots" class="showcase-grid" style="--deck-columns:${Math.ceil(rules.size / 2)}"></div><p id="deck-error" role="status" hidden></p></section>
    <section class="collection-dock" aria-label="Bộ sưu tập thẻ"><div class="collection-toolbar"><button id="roster-forge" class="forge-button" aria-label="Nâng cấp tướng">${icon('sword')}<span>Lò rèn</span></button><nav class="collection-filters" aria-label="Lọc thẻ"><button data-filter="all" aria-pressed="true">Tất cả</button><button data-filter="heroes" aria-pressed="false">Tướng</button><button data-filter="spells" aria-pressed="false">Phép</button></nav><span id="collection-count">${catalog.length}</span><button id="collection-prev" class="roster-icon back-icon" aria-label="Thẻ phía trước">${icon('chevron')}</button><button id="collection-next" class="roster-icon" aria-label="Thẻ phía sau">${icon('chevron')}</button></div><div id="roster-grid" class="collection-ribbon">${catalog.map((id) => `<div class="collection-card" data-card="${id}">${art(id)}<span class="collection-level"></span>${meter(id)}</div>`).join('')}</div></section>
    <section id="roster-detail" class="roster-detail" aria-label="Chi tiết thẻ" hidden></section>
  </div>`,
    true,
  );
  const root = $('.roster-screen'),
    detail = $('#roster-detail');
  const showcase = ctx.world.rosterShowcase($('#roster-canvas'));
  const ribbon = swipeRibbon(
    $('#roster-grid'),
    $('#collection-prev') as HTMLButtonElement,
    $('#collection-next') as HTMLButtonElement,
  );
  ownModal(() => {
    disposed = true;
    ribbon.dispose();
    showcase.dispose();
  });
  const views = () =>
    showcase.setViews(
      Array.from(
        (detail.hidden ? $('#deck-slots') : detail).querySelectorAll<HTMLElement>('[data-preview]'),
      ).map((element) => ({
        id: element.dataset.preview!,
        element,
      })),
    );
  const closeDetail = () => {
    detail.hidden = true;
    root.classList.remove('has-detail');
    root.querySelectorAll<HTMLElement>('.roster-header,.roster-stage,.collection-dock').forEach((el) => {
      el.inert = false;
    });
    views();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
  const updateCollection = () => {
    root
      .querySelectorAll<HTMLElement>('.showcase-slot')
      .forEach((button) =>
        button.classList.toggle(
          'is-inspected',
          button.querySelector<HTMLElement>('[data-preview]')?.dataset.preview === inspected,
        ),
      );
    $('#roster-gold').textContent = gameSession.wallet ? number(gameSession.wallet.gold) : '—';
    const homeGold = document.querySelector('#wallet-gold');
    if (homeGold && gameSession.wallet) homeGold.textContent = number(gameSession.wallet.gold);
    root.querySelectorAll<HTMLElement>('.collection-card').forEach((el) => {
      const id = el.dataset.card!,
        p = progress(id),
        button = el.querySelector('button')!;
      const equipped = draft.includes(id);
      el.classList.toggle('in-deck', equipped);
      button.classList.toggle('in-deck', equipped);
      button.classList.toggle('is-inspected', id === inspected);
      button.setAttribute(
        'aria-label',
        `${info(id).name}, ${info(id).cost} mana${isSpell(id) ? '' : `, cấp sưu tập ${p.level}`}${equipped ? ', trong bộ bài' : ''}. Xem chi tiết`,
      );
      el.querySelector('.collection-level')!.textContent = isSpell(id) ? '' : `Cấp ${p.level}`;
      el.querySelector('.figure-progress')!.outerHTML = meter(id);
    });
  };
  const refresh = () => {
    $('#deck-slots').innerHTML = Array.from({ length: rules.size }, (_, i) => {
      const id = draft[i];
      if (!id)
        return `<button class="showcase-slot empty-figure" data-slot="${i}" aria-label="Ô thẻ trống ${i + 1}"><span>+</span></button>`;
      const p = progress(id);
      return `<button class="showcase-slot ${id === inspected ? 'is-inspected' : ''}" data-slot="${i}" aria-label="${escapeHTML(info(id).name)}${isSpell(id) ? '' : `, cấp sưu tập ${p.level}`}. ${replacing ? 'Thay thẻ này' : 'Xem chi tiết'}"><span class="figure-art" data-preview="${id}"></span><span class="figure-name">${escapeHTML(info(id).name)}</span><span class="figure-level"><span class="figure-mana">${info(id).cost}</span><b>${isSpell(id) ? '◆' : `Cấp ${p.level}`}</b></span>${meter(id)}</button>`;
    }).join('');
    $('#draft-count').textContent = replacing ? 'Chọn thẻ cần thay' : `${draft.length}/${rules.size}`;
    const error = cardDeckError(draft, config, ctx.heroes);
    $('#deck-error').textContent = error ?? '';
    $('#deck-error').hidden = !error;
    $('#save-deck').toggleAttribute('disabled', !!error);
    $('#save-deck').setAttribute('aria-label', `Lưu bộ bài ${draft.length}/${rules.size} thẻ`);
    root.classList.toggle('is-replacing', !!replacing);
    $('#roster-forge').innerHTML = replacing
      ? `${icon('close')}<span>Hủy</span>`
      : `${icon('sword')}<span>Lò rèn</span>`;
    $('#roster-forge').setAttribute('aria-label', replacing ? 'Hủy thay thẻ' : 'Nâng cấp tướng');
    updateCollection();
    views();
  };
  const inspect = (id: string, celebration = false) => {
    inspected = id;
    if (detail.hidden) returnFocus = document.activeElement as HTMLElement;
    const data = info(id),
      p = progress(id),
      spell = isSpell(id),
      equipped = draft.includes(id),
      h = ctx.heroMap[id];
    const stats = spell
      ? `<div class="collection-stat">${icon('bolt')}<span>Mana</span><b>${data.cost}</b></div><div class="collection-stat">${icon('retry')}<span>Hồi phép</span><b>${spells[id as SpellId].cooldown}s</b></div>`
      : `<div class="collection-stat">${icon('sword')}<span>Công</span><b>${h.attack}</b></div><div class="collection-stat">${icon('shield')}<span>Máu</span><b>${h.hp}</b></div><div class="collection-stat">${icon('flag')}<span>Tầm đánh</span><b>${h.range}m</b></div><div class="collection-stat">${icon('bolt')}<span>Tốc độ</span><b>${h.speed}</b></div>`;
    detail.hidden = false;
    root.classList.add('has-detail');
    detail.classList.toggle('upgrade-celebration', celebration);
    detail.innerHTML = `<header class="detail-heading"><div><h3>${escapeHTML(data.name)}</h3><span>${spell ? 'Phép' : `${escapeHTML(ORIGINS[h.origin].name)} · ${escapeHTML(ROLES[h.role].name)}`}</span></div><button id="detail-close" class="roster-icon" aria-label="Đóng chi tiết">${icon('close')}</button></header><div class="detail-body"><div class="detail-figure"><div class="detail-preview" data-preview="${id}"></div><span class="detail-level">${celebration ? '↑ ' : ''}${spell ? `${data.cost} ◆` : `Cấp ${p.level}`}</span>${meter(id)}</div><div class="detail-info"><div class="collection-stats">${stats}</div><div class="detail-ability"><strong>${escapeHTML(spell ? data.name : h.ability)}</strong><p>${escapeHTML(data.description)}</p></div>${spell ? '' : '<small class="normalized-note">Cấp sưu tập · Chỉ số trong trận chuẩn hóa</small>'}<div class="detail-actions"><button id="toggle-hero" class="roster-toggle" ${busy ? 'disabled' : ''}>${equipped ? '− Bỏ' : draft.length >= rules.size ? 'Thay thẻ' : '+ Thêm'}</button>${spell ? '' : `<button id="upgrade-hero" class="roster-upgrade" ${busy || !p.canUpgrade ? 'disabled' : ''} aria-label="Nâng cấp ${escapeHTML(data.name)} lên cấp ${p.level + 1}, ${p.need} mảnh và ${p.cost} vàng"><span>${busy ? 'Đang nâng…' : p.max ? 'Tối đa' : '↑ Nâng cấp'}</span>${p.max ? '' : `<b><i>●</i> ${number(p.cost)}</b>`}</button>`}</div><p id="upgrade-status" role="status">${celebration ? `Đã nâng lên cấp ${p.level}` : spell ? '' : p.reason}</p></div></div>`;
    root.querySelectorAll<HTMLElement>('.roster-header,.roster-stage,.collection-dock').forEach((el) => {
      el.inert = true;
    });
    $('#detail-close').onclick = closeDetail;
    $('#toggle-hero').onclick = () => {
      if (busy) return;
      if (equipped) draft.splice(draft.indexOf(id), 1);
      else if (draft.length >= rules.size) replacing = id;
      else draft.push(id);
      closeDetail();
      refresh();
    };
    const upgrade = detail.querySelector<HTMLButtonElement>('#upgrade-hero');
    if (!spell) {
      const controls = document.createElement('nav');
      controls.className = 'model-preview-actions';
      controls.setAttribute('aria-label', `Xem hoạt ảnh ${data.name}`);
      controls.innerHTML = (['idle', 'walk', 'attack', 'cast'] as const)
        .map(
          (action, i) =>
            `<button type="button" data-preview-action="${action}" aria-pressed="${action === 'walk'}" aria-label="Xem ${['đứng', 'di chuyển', 'đánh thường', 'kỹ năng'][i]} của ${escapeHTML(data.name)}">${['Đứng', 'Đi', 'Đánh', 'Chiêu'][i]}</button>`,
        )
        .join('');
      const previewStatus = document.createElement('p');
      previewStatus.className = 'model-preview-status';
      previewStatus.setAttribute('role', 'status');
      previewStatus.hidden = true;
      detail.querySelector('.detail-figure')!.append(controls, previewStatus);
      controls.onclick = (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-preview-action]');
        if (!button) return;
        if (!showcase.preview(id, button.dataset.previewAction as ShowcaseAction)) {
          previewStatus.textContent = 'Hoạt ảnh chưa sẵn sàng.';
          previewStatus.hidden = false;
          return;
        }
        previewStatus.hidden = true;
        previewStatus.textContent = '';
        controls
          .querySelectorAll('button')
          .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      };
    }
    if (upgrade)
      upgrade.onclick = async () => {
        if (busy || !progress(id).canUpgrade) return;
        busy = true;
        inspect(id);
        try {
          await gameSession.trade('upgrade', { hero: id });
          if (disposed) return;
          busy = false;
          ctx.sound.tone('skill');
          refresh();
          if (!detail.hidden) inspect(inspected, inspected === id);
        } catch (error) {
          if (disposed) return;
          busy = false;
          if (!detail.hidden) {
            inspect(inspected);
            $('#upgrade-status').textContent = (error as Error).message;
          } else ctx.toast((error as Error).message);
        }
      };
    updateCollection();
    views();
    if (!spell) showcase.preview(id, 'walk');
    $('#detail-close').focus({ preventScroll: true });
  };
  $('#deck-slots').onclick = (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!button) return;
    const slot = Number(button.dataset.slot),
      id = draft[slot];
    if (replacing) {
      if (id) draft[slot] = replacing;
      else draft.push(replacing);
      inspected = replacing;
      replacing = undefined;
      refresh();
    } else if (id) inspect(id);
    else {
      $('#roster-grid button')?.focus({ preventScroll: true });
    }
  };
  $('#roster-grid').onclick = (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-hero]');
    if (button) {
      if (replacing) {
        replacing = undefined;
        refresh();
      }
      inspect(button.dataset.hero!);
    }
  };
  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(
    (button) =>
      (button.onclick = () => {
        const filter = button.dataset.filter;
        root
          .querySelectorAll<HTMLElement>('.collection-card')
          .forEach(
            (el) =>
              (el.hidden =
                filter === 'heroes'
                  ? isSpell(el.dataset.card!)
                  : filter === 'spells'
                    ? !isSpell(el.dataset.card!)
                    : false),
          );
        root
          .querySelectorAll('[data-filter]')
          .forEach((el) => el.setAttribute('aria-pressed', String(el === button)));
        $('#collection-count').textContent = String(
          root.querySelectorAll('.collection-card:not([hidden])').length,
        );
        $('#roster-grid').scrollLeft = 0;
        ribbon.refresh();
      }),
  );
  $('#roster-forge').onclick = () => {
    if (replacing) {
      replacing = undefined;
      refresh();
    } else inspect(inspected);
  };
  $('#roster-close').onclick = closeModal;
  $('#save-deck').onclick = () => {
    if (cardDeckError(draft, config, ctx.heroes)) return;
    ctx.cards = draft.slice();
    ctx.deck = [...new Set(draft.filter((id) => !isSpell(id)))];
    ctx.spells = [...new Set(draft.filter(isSpell))];
    ctx.persist();
    ctx.preview();
    ctx.renderDeck();
    closeModal();
    ctx.toast('Đã lưu bộ bài.');
  };
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.stopPropagation();
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(
        (button) => button.checkVisibility() && !button.closest('[inert]'),
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus({ preventScroll: true });
      }
    }
    if (e.key === 'Escape' && !detail.hidden) {
      e.stopPropagation();
      closeDetail();
    }
  });
  refresh();
  if (forge) inspect(inspected);
}
