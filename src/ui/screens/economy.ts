import { gameSession } from '../../services/game-session';
import { $ } from '../dom';
import { closeModal, modal, ownModal } from '../modal';
import { pageDeck } from '../page-deck';
import type { ScreenContext } from '../screen-context';
import { openRoster } from './openRoster';
export function economy(ctx: ScreenContext, tab: 'shop' | 'forge' | 'chest' = 'shop') {
  if (tab === 'forge') {
    openRoster(ctx, ctx.cards[0], true);
    return;
  }
  const wallet = gameSession.wallet;
  if (!wallet) {
    ctx.toast('Kết nối server để mở kho báu và cửa hàng.');
    return;
  }
  const c = gameSession.content;
  const collection = ctx.gameplay.collection;
  modal(
    `<div class="economy-screen"><header class="economy-header"><div><small>KORA WAR · AETHER VAULT</small><h2>${tab === 'shop' ? 'Thương hội' : 'Kho báu'}</h2></div><strong>◉ ${wallet.gold.toLocaleString('vi')}</strong><button id="economy-close" aria-label="Đóng kho báu">×</button></header><nav class="economy-tabs"><button data-tab="shop" class="${tab === 'shop' ? 'active' : ''}">◉ Cửa hàng</button><button data-tab="forge" class="">⚒ Nâng cấp</button><button data-tab="chest" class="${tab === 'chest' ? 'active' : ''}">▣ Rương</button></nav><p class="economy-note">Cấp sưu tập không tăng sức mạnh trong trận. Mọi tướng và phép đều dùng chỉ số chuẩn hóa.</p><div id="economy-feedback" role="status"></div>${
      tab === 'chest'
        ? `<div class="chest-view"><div class="aether-chest"><span>◈</span><i></i></div><h3>Rương Aether</h3><p>${collection.chestDraws} mảnh tướng + ${c.economy.chestGold} vàng</p><button class="primary" id="open-chest" ${wallet.gold < c.economy.chestCost ? 'disabled' : ''}>Mở · ◉ ${c.economy.chestCost}</button></div>`
        : `<div class="economy-grid">${c.items
            .map((item) => {
              const h = c.heroes.find((h) => h.id === item.heroId)!;
              return `<article class="economy-item">${ctx.card(h, 0, true)}<span>×${item.copies} mảnh</span><button data-buy="${item.id}" ${wallet.gold < item.price ? 'disabled' : ''}>◉ ${item.price}</button></article>`;
            })
            .join('')}</div>`
    }</div>`,
    true,
  );
  const grid = document.querySelector<HTMLElement>('.economy-grid');
  if (grid) ownModal(pageDeck(grid, 5, 'Kho Aether').dispose);
  $('#economy-close').onclick = closeModal;
  document
    .querySelectorAll<HTMLButtonElement>('[data-tab]')
    .forEach((b) => (b.onclick = () => economy(ctx, b.dataset.tab as typeof tab)));
  let busy = false;
  let disposed = false;
  ownModal(() => {
    disposed = true;
  });
  const trade = async (
    button: HTMLButtonElement,
    action: 'buy' | 'chest',
    data: Record<string, string> = {},
  ) => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    try {
      const result = await gameSession.trade(action, data);
      if (disposed) return;
      ctx.sound.tone('skill');
      economy(ctx, tab);
      if (action === 'chest') {
        const rewards = result.rewards!.map((id) => c.heroes.find((h) => h.id === id)!);
        $('#economy-feedback').innerHTML =
          `<div class="chest-rewards">${rewards.map((h) => `<div>${ctx.card(h, 0, true)}<b>+1</b></div>`).join('')}<strong>+${result.gold} ◉</strong></div>`;
      } else $('#economy-feedback').textContent = 'Đã nhận mảnh tướng!';
      document.querySelector('#wallet-gold')!.textContent = String(gameSession.wallet!.gold);
    } catch (e) {
      if (disposed) return;
      $('#economy-feedback').textContent = e instanceof Error ? e.message : String(e);
      button.disabled = false;
      busy = false;
    }
  };
  document
    .querySelectorAll<HTMLButtonElement>('[data-buy]')
    .forEach((b) => (b.onclick = () => void trade(b, 'buy', { item: b.dataset.buy! })));
  const chest = document.querySelector<HTMLButtonElement>('#open-chest');
  if (chest) chest.onclick = () => void trade(chest, 'chest');
}
