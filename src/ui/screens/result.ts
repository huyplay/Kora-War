import { $ } from '../dom';
import { icon } from '../icons';
import { modal } from '../modal';
import type { ScreenContext } from '../screen-context';
export function result(ctx: ScreenContext) {
    if (ctx.endedShown)
        return;
    ctx.endedShown = true;
    ctx.clearSelection();
    ctx.tutorial = 0;
    $('#tutorial-hint').hidden = true;
    const won = ctx.battle.winner === 0, s = ctx.battle.stats[0];
    if (won && !ctx.battle.debugUsed) {
        ctx.wins++;
        ctx.persist();
    }
    ctx.sound.tone(won ? 'win' : 'lose');
    modal(`<div class="result-emblem ${won ? '' : 'defeat'}">${won ? '♜' : '◈'}</div><div class="modal-content centered result-content"><span class="eyebrow">${ctx.battle.debugUsed ? 'TRẬN THỬ NGHIỆM · DEBUG' : 'CHƯƠNG I · THUNG LŨNG KHỞI NGUYÊN'}</span><h2>${won ? 'Ánh sáng thuộc về bạn.' : 'Bình minh sẽ trở lại.'}</h2><span class="result-verdict">${won ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</span><p>${won ? 'Lõi Hoàng Hôn đã được đánh chiếm. Một ngọn lửa mới thắp sáng Elyndra.' : 'Lõi Bình Minh đã thất thủ. Đổi đội hình, chọn chiến tuyến và trở lại mạnh mẽ hơn.'}</p><div class="result-stats"><span><b>${ctx.formatTime(ctx.battle.time)}</b>Thời gian</span><span><b>${s.deployed}</b>Tướng gọi</span><span><b>${s.kills}</b>Hạ gục</span><span><b>${Math.round(s.damage).toLocaleString('vi')}</b>Sát thương</span></div><div class="result-mini">${s.towers}/3 trụ phá hủy <i>·</i> ${s.skills} kỹ năng <i>·</i> ${Math.round(s.healed)} máu hồi</div><button class="primary full" id="play-again">${icon('retry')} Chơi lại</button><button class="secondary full" id="back-lobby">Về sảnh & đổi đội hình</button></div>`);
    $('#play-again').onclick = () => ctx.startBattle();
    $('#back-lobby').onclick = ctx.lobby;
    const reward = document.createElement('div');
    reward.id = 'result-reward';
    reward.setAttribute('role', 'status');
    $('.result-mini').after(reward);
    if (!ctx.battle.debugUsed)
        void ctx.claimReward().then(gold => {
            if (reward.isConnected)
                reward.textContent = gold ? `+${gold} ◉` : '';
        }).catch(() => {
            if (reward.isConnected)
                reward.textContent = 'Chưa thể nhận thưởng · kiểm tra kết nối server';
        });
}
