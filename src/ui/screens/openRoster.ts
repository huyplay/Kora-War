import { HEROES, HERO_MAP, ORIGINS, ROLES, traits } from '../../data/index';
import { $ } from '../dom';
import { icon } from '../icons';
import { closeModal, modal } from '../modal';
import type { ScreenContext } from '../screen-context';
export function openRoster(ctx: ScreenContext, focusId = ctx.deck[0]) {
    if (ctx.mode === 'battle') {
        ctx.toast('Đội hình được khóa trong trận. Bạn có thể đổi ở sảnh.');
        return;
    }
    let draft = ctx.deck.slice();
    let inspected = focusId;
    modal(`<div class="modal-top"><div><span class="eyebrow">NHỮNG NGƯỜI BẢO HỘ ELYNDRA</span><h2>Chọn người đồng hành.</h2><p>Ghép 2 tướng cùng tộc hoặc hệ để kích hoạt synergy.</p></div><button class="icon-button" id="roster-close" aria-label="Đóng đội hình">${icon('close')}</button></div><div class="roster-layout"><div id="roster-grid">${HEROES.map((h, i) => ctx.card(h, i, true)).join('')}</div><aside id="hero-detail"></aside></div><div class="roster-footer"><div><strong id="draft-count"></strong><span id="draft-traits"></span></div><button class="primary" id="save-deck">Lưu đội hình ${icon('chevron')}</button></div>`, true);
    const refresh = () => {
        const h = HERO_MAP[inspected];
        document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach(b => { b.classList.toggle('in-deck', draft.includes(b.dataset.hero!)); b.classList.toggle('inspected', b.dataset.hero === inspected); });
        $('#draft-count').textContent = `ĐÃ CHỌN ${draft.length}/4`;
        const active = Object.entries(traits(draft)).filter(([, n]) => n >= 2).map(([id]) => (ORIGINS as Record<string, {
            name: string;
        }>)[id]?.name || (ROLES as Record<string, {
            name: string;
        }>)[id]?.name);
        $('#draft-traits').textContent = active.length ? active.join(' + ') : 'Chưa có liên kết kích hoạt';
        $('#save-deck').toggleAttribute('disabled', draft.length !== 4);
        $('#hero-detail').innerHTML = `<span class="eyebrow" style="color:${ORIGINS[h.origin].color}">${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].name} · ${ROLES[h.role].name}</span><h3>${h.name}</h3><p class="hero-title">${h.title}</p><div class="stat-grid"><span><b>${h.hp}</b>Máu</span><span><b>${h.attack}</b>Sát thương</span><span><b>${h.range}m</b>Tầm đánh</span><span><b>${h.cost}</b>Mana</span></div><h4>✦ ${h.ability}</h4><p>${h.description}</p><small>Tự dùng khi có mục tiêu phù hợp. Hồi ${h.skillCooldown} giây.</small><div class="detail-traits"><p>${ORIGINS[h.origin].icon} ${ORIGINS[h.origin].effect}</p><p>${ROLES[h.role].icon} ${ROLES[h.role].effect}</p></div><button class="secondary" id="toggle-hero">${draft.includes(h.id) ? '− Bỏ khỏi đội hình' : '+ Thêm vào đội hình'}</button>`;
        $('#toggle-hero').onclick = () => {
            if (draft.includes(h.id))
                draft = draft.filter(id => id !== h.id);
            else if (draft.length < 4)
                draft.push(h.id);
            else {
                ctx.toast('Đội hình đã đủ 4 tướng. Bỏ một tướng trước khi thêm.');
                return;
            }
            refresh();
        };
    };
    document.querySelectorAll<HTMLElement>('#roster-grid .hero-card').forEach(b => b.onclick = () => { inspected = b.dataset.hero!; refresh(); });
    $('#save-deck').onclick = () => {
        if (draft.length !== 4)
            return;
        ctx.deck = draft;
        ctx.persist();
        ctx.renderDeck();
        ctx.preview();
        closeModal();
        ctx.toast('Đội hình đã sẵn sàng.');
    };
    $('#roster-close').onclick = closeModal;
    refresh();
}
