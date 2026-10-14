import type { HandCard } from '../../core/draw-deck';
import { $ } from '../dom';
import { modal } from '../modal';
import { COMPAT_GAMEPLAY, type GameplayConfig } from '../../data/gameplay';
export function openingHand(
  cards: HandCard[],
  render: (id: string, index: number) => string,
  confirm: (uids: number[]) => Promise<string | null>,
  toast: (text: string) => void,
  leave: () => void,
  config: GameplayConfig = COMPAT_GAMEPLAY,
) {
  const limit = config.deck.mulligan;
  const selected = new Set<number>();
  modal(
    `<div class="opening-header"><span class="eyebrow">CHUẨN BỊ XUẤT TRẬN</span><h2>Bài khởi đầu</h2><p>Chọn tối đa ${limit} thẻ để đổi. Ít nhất ${config.deck.minHeroes} tướng và ${config.deck.minSpells} phép.</p></div><div class="opening-hand">${cards.map((card, index) => `<div data-opening="${card.uid}">${render(card.id, index)}<span class="swap-label">ĐỔI</span></div>`).join('')}</div><p id="opening-status" role="status">0 / ${limit} thẻ được chọn</p><p id="opening-countdown" hidden></p><div class="opening-actions"><button class="secondary" id="opening-keep">Giữ bài</button><button class="primary" id="opening-confirm">Vào trận</button><button class="text-button" id="opening-leave">Về sảnh</button></div>`,
    true,
  );
  const update = () => {
    $('#opening-status').textContent = `${selected.size} / ${limit} thẻ được chọn`;
    $('#opening-confirm').textContent = selected.size ? `Đổi ${selected.size} thẻ & vào trận` : 'Vào trận';
  };
  document.querySelectorAll<HTMLElement>('[data-opening]').forEach((element) => {
    const button = element.querySelector('button')!;
    button.onclick = () => {
      const uid = Number(element.dataset.opening);
      if (selected.has(uid)) selected.delete(uid);
      else if (selected.size < limit) selected.add(uid);
      else {
        toast(`Chỉ đổi tối đa ${limit} thẻ.`);
        return;
      }
      element.classList.toggle('will-swap', selected.has(uid));
      button.setAttribute('aria-pressed', String(selected.has(uid)));
      update();
    };
  });
  const submit = async (uids: number[]) => {
    document
      .querySelectorAll<HTMLButtonElement>('.opening-actions button, .opening-hand button')
      .forEach((button) => (button.disabled = true));
    const error = await confirm(uids);
    if (error && document.querySelector('#opening-status')) {
      $('#opening-status').textContent = error;
      document
        .querySelectorAll<HTMLButtonElement>('.opening-actions button, .opening-hand button')
        .forEach((button) => (button.disabled = false));
    }
  };
  $('#opening-keep').onclick = () => void submit([]);
  $('#opening-confirm').onclick = () => void submit([...selected]);
  $('#opening-leave').onclick = leave;
}
