import { CHAPTER_ONE as story } from '../../data/story';
import { $ } from '../dom';
import { icon } from '../icons';
import { closeModal, modal, ownModal } from '../modal';
import { pageDeck } from '../page-deck';
import type { ScreenContext } from '../screen-context';
export function openStory(ctx: ScreenContext, tutorialStart = false) {
  if (ctx.mode === 'battle') {
    ctx.toast('Hãy hoàn tất trận đấu trước khi mở biên niên sử.');
    return;
  }
  modal(
    `<div class="chapter-art"><span class="story-orbit"></span><span class="story-crystal">◈</span><span class="eyebrow">${story.chronicle}</span></div><div class="modal-content"><span class="eyebrow">${story.chapter}</span><h2>${story.title.join('<br>')}</h2><div id="story-pages"><p>${story.paragraphs[0]}</p><p>${story.paragraphs[1]}</p></div><div class="mission-box">${icon('flag')}<div><b>Nhiệm vụ: ${story.mission}</b><small>${story.objective}</small></div></div><div class="modal-actions"><button class="primary" id="begin-tutorial">${tutorialStart ? 'Bắt đầu hướng dẫn' : 'Nhận nhiệm vụ'} ${icon('chevron')}</button><button class="secondary" id="skip-tutorial">Vào trận ngay</button></div><button class="text-button modal-back" id="story-close">Quay về sảnh</button></div>`,
  );
  $('.modal').classList.add('story-modal');
  ownModal(pageDeck($('#story-pages'), 1, 'Cốt truyện').dispose);
  $('#begin-tutorial').onclick = () => ctx.startBattle(true);
  $('#skip-tutorial').onclick = () => ctx.startBattle(false);
  $('#story-close').onclick = closeModal;
}
